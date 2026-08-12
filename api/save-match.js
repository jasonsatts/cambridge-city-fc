export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { matchData } = req.body;

    if (!matchData) {
      return res.status(400).json({ error: 'No match data provided' });
    }

    // Log the match data (in production, you'd write to Google Sheets here)
    console.log('Match Data Received:', JSON.stringify(matchData, null, 2));

    // For now, we'll return a success message
    // In production, integrate with Google Sheets API to write the data
    // You'd need:
    // - Google Service Account credentials
    // - The sheets library
    // - Proper authentication

    res.status(200).json({
      success: true,
      message: 'Match data saved',
      data: {
        matchDate: new Date().toISOString(),
        eventsRecorded: matchData.events?.length || 0,
        goalsRecorded: matchData.events?.filter(e => e.event === 'Goal').length || 0,
      }
    });
  } catch (error) {
    console.error('Save match error:', error);
    res.status(500).json({ error: error.message });
  }
}
