/**
 * Configuration loader
 * Reads environment variables from .env and exposes a typed config object.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const config = {
    // UIDAI Auth API
    uidai: {
        authUrl: process.env.UIDAI_AUTH_URL || 'https://auth.uidai.gov.in/2.5/',
        auaCode: process.env.AUA_CODE || '',
        subAuaCode: process.env.SUB_AUA_CODE || '',
        asaLicenseKey: process.env.ASA_LICENSE_KEY || '',
        publicKeyPath: process.env.UIDAI_PUBLIC_KEY_PATH || './keys/uidai_public_key.pem',
    },

    // PostgreSQL
    postgres: {
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT, 10) || 5432,
        database: process.env.PG_DATABASE || 'aa_consent_db',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
        ssl: process.env.PG_SSL === 'true' || true, // Neon DB requires SSL
    },

    // Account Aggregator
    aa: {
        baseUrl: process.env.AA_BASE_URL || 'https://aa-sandbox.example.com/v2',
        clientId: process.env.AA_CLIENT_ID || 'fiu-client-001',
        clientApiKey: process.env.AA_CLIENT_API_KEY || 'test-api-key',
        privateKeyPath: process.env.AA_PRIVATE_KEY_PATH || './keys/fiu_private_key.pem',
    },

    // BBPS Aggregator (Setu / Decentro)
    bbps: {
        baseUrl: process.env.BBPS_BASE_URL || 'https://bbps-sandbox.setu.co/v1',
        apiKey: process.env.BBPS_API_KEY || 'test-bbps-api-key',
        apiSecret: process.env.BBPS_API_SECRET || 'test-bbps-secret',
        productInstanceId: process.env.BBPS_PRODUCT_ID || 'test-product-id',
    },

    // GST Suvidha Provider (Setu / Decentro GST)
    gsp: {
        baseUrl: process.env.GSP_BASE_URL || 'https://gst-sandbox.setu.co/v1',
        apiKey: process.env.GSP_API_KEY || 'test-gsp-api-key',
        apiSecret: process.env.GSP_API_SECRET || 'test-gsp-secret',
        productInstanceId: process.env.GSP_PRODUCT_ID || 'test-gsp-product-id',
        kycBaseUrl: process.env.SETU_KYC_BASE_URL || 'https://bridge.setu.co/okyc/v1',
    },

    // Masters India GST API — https://docs.mastersindia.co/goods-and-services-tax-gst-api/
    mastersIndia: {
        baseUrl:
            process.env.MASTERS_INDIA_API_BASE || 'https://api-platform.mastersindia.co/api/v1',
        /** Paste token from Masters India dashboard / token-auth (use `JWT <token>` or raw token). */
        jwt: process.env.MASTERS_INDIA_JWT || '',
        username: process.env.MASTERS_INDIA_USERNAME || '',
        password: process.env.MASTERS_INDIA_PASSWORD || '',
        productId: process.env.MASTERS_INDIA_PRODUCT_ID || 'enterprises',
    },

    // SMS OTP Configuration (Hackathon Demo)
    sms: {
        service: process.env.SMS_SERVICE || 'FAST2SMS',
        apiKey: process.env.SMS_API_KEY || '',
        twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID || '',
            authToken: process.env.TWILIO_AUTH_TOKEN || '',
            phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
        },
        demoPhone: process.env.DEMO_PHONE_NUMBER || '',
    },

    // Social OAuth Providers
    social: {
        linkedin: {
            clientId: process.env.LINKEDIN_CLIENT_ID || '',
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
            redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/social/oauth/linkedin/callback',
            authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
            tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
            apiBaseUrl: 'https://api.linkedin.com/v2',
        },
        twitter: {
            clientId: process.env.TWITTER_CLIENT_ID || '',
            clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
            redirectUri: process.env.TWITTER_REDIRECT_URI || 'http://localhost:4000/social/oauth/twitter/callback',
            authUrl: 'https://twitter.com/i/oauth2/authorize',
            tokenUrl: 'https://api.twitter.com/2/oauth2/token',
            apiBaseUrl: 'https://api.twitter.com/2',
        },
        instagram: {
            clientId: process.env.INSTAGRAM_CLIENT_ID || '',
            clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
            redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:4000/social/oauth/instagram/callback',
            authUrl: 'https://api.instagram.com/oauth/authorize',
            tokenUrl: 'https://api.instagram.com/oauth/access_token',
            graphUrl: 'https://graph.instagram.com',
        },
        youtube: {
            apiKey: process.env.YOUTUBE_API_KEY || '',
            clientId: process.env.YOUTUBE_CLIENT_ID || '',
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
            redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:4000/social/oauth/youtube/callback',
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            apiBaseUrl: 'https://www.googleapis.com/youtube/v3',
        },
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'default_jwt_secret_change_me',
        expiry: process.env.JWT_EXPIRY || '30m',
    },

    // Server
    port: parseInt(process.env.PORT, 10) || 4000,

    // Rate limiting
    rateLimit: {
        maxAttempts: 3,
        lockoutDurationMs: 5 * 60 * 1000, // 5 minutes
    },
};

module.exports = config;
