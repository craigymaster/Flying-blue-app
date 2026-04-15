export default async function handler(req, res) {
  // Allow any website to call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE } = process.env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Server not configured yet.' });
  }

  const table = AIRTABLE_TABLE || 'Promotions';

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}` +
      `?filterByFormula={Active}=1&sort[0][field]=Hot&sort[0][direction]=desc`;

    const airtableRes = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!airtableRes.ok) {
      const err = await airtableRes.text();
      return res.status(502).json({ error: 'Airtable error', detail: err });
    }

    const data = await airtableRes.json();

    const promotions = data.records.map(r => ({
      id: r.id,
      title: r.fields.Title || '',
      partner: r.fields.Partner || '',
      category: (r.fields.Category || '').toLowerCase(),
      miles: r.fields.Miles || '',
      description: r.fields.Description || '',
      type: (r.fields.Type || 'always').toLowerCase(),
      expires: r.fields.Expires || null,
      tier: (r.fields.Tier || 'all').toLowerCase(),
      hot: r.fields.Hot || false,
    }));

    // Cache response for 1 hour in Vercel edge
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ promotions, updatedAt: new Date().toISOString() });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
