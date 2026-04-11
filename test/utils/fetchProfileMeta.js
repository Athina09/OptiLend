/**
 * Fetches a profile URL and extracts Open Graph / meta tags for display.
 * Tries axios first; on block/failure uses Puppeteer (headless Chrome) as fallback.
 */
const axios = require('axios');

const DEFAULT_TIMEOUT = 15000;

// Full Chrome-like headers to reduce bot blocking (LinkedIn 999, etc.)
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const BROWSER_HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
};

/** Referer per platform so the request looks like it came from the same site */
function getRefererForUrl(url) {
    if (!url) return undefined;
    try {
        const u = new URL(url);
        return u.origin + '/';
    } catch {
        return undefined;
    }
}

function decodeHtmlEntities(str) {
    if (!str) return str;
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&#x27;/g, "'");
}

/**
 * Extract og:title, og:description, og:image, and <title> from HTML string.
 * Handles both content="..." and content='...' and order of attributes.
 * @param {string} html
 * @returns {{ ogTitle?: string, ogDescription?: string, ogImage?: string, title?: string }}
 */
function extractMetaFromHtml(html) {
    const result = {};
    if (!html || typeof html !== 'string') return result;

    const take = (m) => (m ? decodeHtmlEntities(m[1].trim()) : null);

    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
    if (ogTitle) result.ogTitle = take(ogTitle);

    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
    if (ogDesc) result.ogDescription = take(ogDesc);

    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImage) result.ogImage = take(ogImage);

    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleTag) result.title = decodeHtmlEntities(titleTag[1].trim());

    return result;
}

const PUPPETEER_TIMEOUT = 25000;

/**
 * Fallback: fetch profile page with Puppeteer (headless Chrome + stealth) and extract OG meta.
 * Used when axios is blocked (e.g. LinkedIn 999, Instagram/Twitter bot blocks).
 * @param {string} url
 * @returns {Promise<{ fetched: boolean, ogTitle?: string, ogDescription?: string, ogImage?: string, title?: string, profileUrl?: string, error?: string }>}
 */
async function fetchProfileMetaWithPuppeteer(url) {
    let puppeteer;
    try {
        puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());
    } catch (e) {
        console.log('[fetchProfileMeta] Puppeteer fallback unavailable:', e.message);
        return { fetched: false, error: 'Puppeteer not available' };
    }

    let browser;
    try {
        console.log('[fetchProfileMeta] PUPPETEER fallback: launching browser for', url.substring(0, 60) + '...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080',
            ],
        });
        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: PUPPETEER_TIMEOUT,
        });
        // Allow a short time for SPAs to inject og meta
        await new Promise((r) => setTimeout(r, 2000));

        const html = await page.content();
        const meta = extractMetaFromHtml(html);
        // If HTML had no og tags, try reading from DOM (JS may have set them)
        if (!meta.ogTitle && !meta.title) {
            const domMeta = await page.evaluate(() => {
                const getContent = (sel) => {
                    const el = document.querySelector(sel);
                    return el ? el.getAttribute('content') || el.textContent : null;
                };
                return {
                    ogTitle: getContent('meta[property="og:title"]'),
                    ogDescription: getContent('meta[property="og:description"]'),
                    ogImage: getContent('meta[property="og:image"]'),
                    title: document.title || null,
                };
            });
            if (domMeta.ogTitle) meta.ogTitle = domMeta.ogTitle;
            if (domMeta.ogDescription) meta.ogDescription = domMeta.ogDescription;
            if (domMeta.ogImage) meta.ogImage = domMeta.ogImage;
            if (domMeta.title) meta.title = domMeta.title;
        }

        console.log('[fetchProfileMeta] PUPPETEER extracted meta:', JSON.stringify(meta));
        return {
            fetched: true,
            ...meta,
            profileUrl: url,
        };
    } catch (err) {
        const msg = err.message || 'Puppeteer fetch failed';
        console.log('[fetchProfileMeta] PUPPETEER ERROR:', msg);
        return { fetched: false, error: msg };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.warn('[fetchProfileMeta] Browser close:', e.message);
            }
        }
    }
}

/**
 * Fetch profile page and return extracted meta + basic metrics placeholder.
 * @param {string} profileUrl - Valid profile URL.
 * @param {{ platform?: string }} [options] - Optional; platform hint used for Referer.
 * @returns {Promise<Object>} { fetched: true, ogTitle?, ogDescription?, ogImage?, title?, ... } or { fetched: false, error? }
 */
async function fetchProfileMeta(profileUrl, options = {}) {
    console.log('[fetchProfileMeta] INPUT url:', profileUrl ? profileUrl.substring(0, 80) + (profileUrl.length > 80 ? '...' : '') : 'empty', 'platform:', options.platform || 'none');
    if (!profileUrl || typeof profileUrl !== 'string') {
        console.log('[fetchProfileMeta] FAIL: No URL provided');
        return { fetched: false, error: 'No URL provided' };
    }
    const url = profileUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
        console.log('[fetchProfileMeta] FAIL: Invalid URL');
        return { fetched: false, error: 'Invalid URL' };
    }

    const headers = { ...BROWSER_HEADERS };
    const referer = getRefererForUrl(url);
    if (referer) headers['Referer'] = referer;

    try {
        const response = await axios.get(url, {
            timeout: DEFAULT_TIMEOUT,
            maxContentLength: 1024 * 1024, // 1MB
            maxRedirects: 5,
            responseType: 'text',
            headers,
            validateStatus: (status) => status >= 200 && status < 400,
        });

        console.log('[fetchProfileMeta] HTTP status:', response.status, 'contentLength:', typeof response.data === 'string' ? response.data.length : 0);

        const html = response.data;
        const meta = extractMetaFromHtml(html);
        console.log('[fetchProfileMeta] EXTRACTED meta:', JSON.stringify(meta));
        const hasUsefulMeta = (meta.ogTitle || meta.title || meta.ogDescription || meta.ogImage);
        if (hasUsefulMeta) {
            return { fetched: true, ...meta, profileUrl: url };
        }
        console.log('[fetchProfileMeta] No useful meta from axios, trying Puppeteer fallback');
    } catch (err) {
        const message = err.response ? `HTTP ${err.response.status}` : err.message || 'Fetch failed';
        console.log('[fetchProfileMeta] ERROR:', message, '-> trying Puppeteer fallback');
    }

    return fetchProfileMetaWithPuppeteer(url);
}

module.exports = {
    fetchProfileMeta,
    extractMetaFromHtml,
};
