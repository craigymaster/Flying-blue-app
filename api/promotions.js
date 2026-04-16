export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600');

  const SHEET_ID = '1w1jECnvptPrF60QP4eTceuL2QBAZJL08mKdb4hjW6EQ';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  try {
    const r = await fetch(url);
    const text = await r.text();
    const json = JSON.parse(text.substring(47, text.length - 2));
    const rows = json.table.rows;

    const promotions = rows.slice(1).map(row => ({
      title: row.c[0]?.v || '',
      partner: row.c[1]?.v || '',
      category: (row.c[2]?.v || '').toLowerCase(),
      miles: row.c[3]?.v || '',
      description: row.c[4]?.v || '',
      type: (row.c[5]?.v || 'always').toLowerCase(),
      expires: row.c[6]?.v || null,
      tier: (row.c[7]?.v || 'all').toLowerCase(),
      hot: row.c[8]?.v === true || row.c[8]?.v === 'TRUE',
      active: row.c[9]?.v === true || row.c[9]?.v === 'TRUE',
    })).filter(p => p.active && p.title);

    return res.status(200).json({ promotions, updatedAt: new Date().toISOString() });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
