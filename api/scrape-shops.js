const axios = require('axios');
const cheerio = require('cheerio');

const CACHE_KEY = 'scrape-shops';
const CACHE_TTL = 60 * 60 * 24; // 24 uur

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
        url: 'https://www.flyingblue.com/nl/earn/shop-for-miles?country=NL',
        render_js: true,
        js_scenario: JSON.stringify({
          instructions: [
            { wait: 2000 },
            { click: '#didomi-notice-agree-button' },
            { wait: 5000 }
          ]
        })
      }
    });

    const $ = cheerio.load(response.data);
    const shops = [];

    $('swiper-slide').each((_, slide) => {
      const link = $(slide).find('a');
      const url = link.attr('href') || '';
      const imgs = link.find('img');
      const name = $(imgs[0]).attr('alt') || '';
      const logo = $(imgs[1]).attr('src') || '';
      const miles = link.find('p').last().text().trim();
      const categoryMatch = url.match(/earnonline\.flyingblue\.com\/[^/]+\/([^/]+)\//);
      const category = categoryMatch ? categoryMatch[1] : 'overig';
      if (name && miles) shops.push({ name, miles, url, logo, category });
    });

    try { await kvSet(CACHE_KEY, shops, CACHE_TTL); } catch(e) { console.warn('Cache write failed:', e.message); }
    res.status(200).json({ shops, cached: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
