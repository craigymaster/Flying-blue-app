export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE } = process.env;
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Server not configured.' });
  }
  const table = AIRTABLE_TABLE || 'Promotions';
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}?filterByFormula={Active}=1`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
    if (!r.ok) throw new Error(`Airtable ${r.status}`);
    const data = await r.json();
    const promotions = data.records.map(rec => ({ id: rec.id, ...rec.fields }));
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json({ promotions, updatedAt: new Date().toISOString() });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
