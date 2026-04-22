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

function parseShops($, seen, shops) {
  $('.merch-item').each((_, el) => {
    const link = $(el).find('a.merchant-link');
    const href = link.attr('href') || '';
    const name = link.text().trim().replace(/ - Netherlands$/, '').replace(/ NL$/, '');
    const logo = $(el).find('.merch-banner img').attr('src') || $(el).find('img').first().attr('src') || '';
    const milesRaw = $(el).find('.merch-rates').first().text().trim();
    const milesWas = $(el).find('.merch-rates-was').text().replace('was', '').trim();
    const isOffer = $(el).find('.ico-offer').length > 0;
    const categoryMatch = href.match(/\/en\/([^/]+)\//);
    const category = categoryMatch ? categoryMatch[1] : 'overig';
    const url = href ? `https://earnonline.flyingblue.com${href.split('?')[0]}` : '';
    if (name && milesRaw && !seen.has(name)) {
      seen.add(name);
      shops.push({ name, miles: milesRaw, milesWas: milesWas || null, url, logo, category, isOffer });
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const cached = await kvGet(CACHE_KEY);
    if (cached && !req.query.bust) return res.status(200).json({ shops: cached, cached: true });
  } catch(e) { console.warn('Cache read failed:', e.message); }

  try {
    const shops = [];
    const seen = new Set();
    // 317 retailers / 18 per page = 18 pages
    const totalPages = 18;

    for (let page = 1; page <= totalPages; page++) {
      const url = `https://earnonline.flyingblue.com/en/az?orderBy=popular&letter=&page=${page}&init=1&countryID[]=145`;
      const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: {
          api_key: process.env.SCRAPINGBEE_API_KEY,
          url,
          render_js: false, // no JS needed, direct page URL
        },
        timeout: 30000
      });
      const $ = cheerio.load(response.data);
      parseShops($, seen, shops);

      // Stop if no more items found
      if ($('.merch-item').length === 0) break;
    }

    try { await kvSet(CACHE_KEY, shops, CACHE_TTL); } catch(e) { console.warn('Cache write failed:', e.message); }
    res.status(200).json({ shops, cached: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};