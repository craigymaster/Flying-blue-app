const axios = require('axios');
const cheerio = require('cheerio');

const CACHE_KEY = 'earn-online';
const CACHE_TTL = 60 * 60 * 24;

async function kvGet(key) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value, ttl) {
  await fetch(`${process.env.KV_REST_API_URL}/set/${key}?ex=${ttl}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const cached = await kvGet(CACHE_KEY);
    if (cached) return res.status(200).json({ shops: cached, cached: true });
  } catch(e) { console.warn('Cache read failed:', e.message); }

  try {
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: 'https://earnonline.flyingblue.com/en/?countryID[]=145',
        render_js: true,
        js_scenario: JSON.stringify({
          instructions: [{ wait: 3000 }]
        })
      }
    });

    const $ = cheerio.load(response.data);
    const shops = [];
    const seen = new Set();

    $('.merch-item').each((_, el) => {
      const link = $(el).find('a.merchant-link');
      const href = link.attr('href') || '';
      const name = link.text().trim().replace(/ - Netherlands$/, '').replace(/ NL$/, '');
      const logo = $(el).find('.merch-banner img').attr('src') || '';
      const milesRaw = $(el).find('.merch-rates').first().text().trim();
      const milesWas = $(el).find('.merch-rates-was').text().replace('was', '').trim();
      const isOffer = $(el).find('.ico-offer').length > 0;
      const categoryMatch = href.match(/^([^/]+)\//);
      const category = categoryMatch ? categoryMatch[1] : 'overig';
      const url = href ? `https://earnonline.flyingblue.com/en/${href.split('?')[0]}` : '';
      if (name && milesRaw && !seen.has(name)) {
        seen.add(name);
        shops.push({ name, miles: milesRaw, milesWas: milesWas || null, url, logo, category, isOffer });
      }
    });

    try { await kvSet(CACHE_KEY, shops, CACHE_TTL); } catch(e) { console.warn('Cache write failed:', e.message); }
    res.status(200).json({ shops, cached: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
