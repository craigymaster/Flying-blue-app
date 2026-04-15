export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE } = process.env;
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Missing env vars', key: !!AIRTABLE_API_KEY, base: !!AIRTABLE_BASE_ID });
  }
  const table = AIRTABLE_TABLE || 'Promotions';
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
  const data = await r.json();
  return res.status(200).json({ status: r.status, data });
}
