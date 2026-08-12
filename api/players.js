export default async function handler(req, res) {
  try {
    const SHEET_ID = '1HNU4KIb_84KTASKqwV32Jeo3Wcr4jJyV2px5hM9eC9s';
    const PLAYERS_GID = '1456060265';
    const PLAYERS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${PLAYERS_GID}`;

    // Fetch on server side (no CORS issues)
    const response = await fetch(PLAYERS_CSV_URL);
    
    if (!response.ok) {
      return res.status(500).json({ 
        error: `Failed to fetch sheet: ${response.status}` 
      });
    }

    const csvText = await response.text();
    
    // Parse CSV
    const rows = csvText.trim().split('\n').filter(row => row.trim());
    
    if (rows.length < 2) {
      return res.status(400).json({ error: 'Sheet is empty' });
    }

    // Skip header, parse players
    const players = rows.slice(1).map((row, idx) => {
      const cols = row.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      return {
        id: idx + 1,
        playerId: cols[0] || idx + 1,
        squadNum: cols[1] || idx + 1,
        firstName: cols[2] || '',
        surname: cols[3] || '',
        position: cols[4] || '',
        fullName: `${cols[2] || ''} ${cols[3] || ''}`.trim(),
      };
    }).filter(p => p.firstName || p.surname);

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ players });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
