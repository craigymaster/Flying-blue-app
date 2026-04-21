const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://earnonline.flyingblue.com/en/?countryID[]=145';

let cache = null;
let cacheTime = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 uur

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (cache && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
    return res.status(200).json({ shops: cache, cached: true });
  }

  try {
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: process.env.SCRAPINGBEE_API_KEY,
        url: 'https://earnonline.flyingblue.com/en/',
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

      // Haal category uit href: "travel/booking-com-nl" -> "travel"
      const categoryMatch = href.match(/^([^/]+)\//);
      const category = categoryMatch ? categoryMatch[1] : 'overig';

      // URL opbouwen
      const url = href ? BASE_URL + href.split('?')[0] : '';

      // Deduplicate op naam
      if (name && milesRaw && !seen.has(name)) {
        seen.add(name);
        shops.push({
          name,
          miles: milesRaw,
          milesWas: milesWas || null,
          url,
          logo,
          category,
          isOffer
        });
      }
    });

    cache = shops;
    cacheTime = Date.now();

    res.status(200).json({ shops, cached: false });
  } catch (error) {
    if (cache) {
      return res.status(200).json({ shops: cache, cached: true, stale: true });
    }
    res.status(500).json({ error: error.message });
  }
};
