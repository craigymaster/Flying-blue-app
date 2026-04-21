const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
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

      if (name && miles) {
        shops.push({ name, miles, url, logo, category });
      }
    });

    res.status(200).json({ shops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
