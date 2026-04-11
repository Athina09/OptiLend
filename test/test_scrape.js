const axios = require('axios');

async function testScrape() {
    console.log('--- Testing Real Social Scraping ---');
    try {
        const response = await axios.post('http://localhost:4000/social/footprint', {
            url: 'https://www.linkedin.com/in/dhanvanthgs/'
        });
        console.log('Response Status:', response.status);
        console.log('Scraped Data:', JSON.stringify(response.data, null, 2));
    } catch (err) {
        console.error('Test Failed:', err.response?.data || err.message);
    }
}

testScrape();
