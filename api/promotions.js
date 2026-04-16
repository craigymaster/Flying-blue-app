export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60');

  const SHEET_ID = '1w1jECnvptPrF60QP4eTceuL2QBAZJL08mKdb4hjW6EQ';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  try {
    const r = await fetch(url);
    const text = await r.text();
    const json = JSON.parse(text.substring(47, text.length - 2));
    const rows = json.table.rows;

    const promotions = rows.map(row => {
      const expiresRaw = row.c[6]?.v;
      let expires = null;
      if (expiresRaw) {
        if (typeof expiresRaw === 'string' && expiresRaw.startsWith('Date(')) {
          const parts = expiresRaw.slice(5, -1).split(',');
          expires = `${parts[0]}-${String(+parts[1]+1).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}`;
        } else {
          expires = expiresRaw;
        }
      }
      return {
        title: row.c[0]?.v || '',
        partner: row.c[1]?.v || '',
        category: (row.c[2]?.v || '').toLowerCase(),
        miles: String(row.c[3]?.v || ''),
        description: row.c[4]?.v || '',
        type: (row.c[5]?.v || 'always').toLowerCase(),
        expires,
        tier: (row.c[7]?.v || 'all').toLowerCase(),
        hot: row.c[8]?.v === true || row.c[8]?.v === 'TRUE',
        active: row.c[9]?.v === true || row.c[9]?.v === 'TRUE',
      };
    }).filter(p => p.active && p.title);

    return res.status(200).json({ promotions, updatedAt: new Date().toISOString() });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
