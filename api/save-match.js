import { google } from 'googleapis';
import { auth } from 'google-auth-library';

// Google Sheet configuration
const SHEET_ID = '1HNU4KIb_84KTASKqwV32Jeo3Wcr4jJyV2px5hM9eC9s';

/**
 * Writes match data to Google Sheets
 * Requires GOOGLE_SHEETS_CREDENTIALS environment variable with Service Account JSON
 */
async function writeToGoogleSheets(matchData) {
  try {
    // Check if credentials exist
    const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credentialsJson) {
      console.log('⚠️  Google Sheets credentials not configured. Skipping write.');
      return { success: false, message: 'Credentials not configured' };
    }

    const credentials = JSON.parse(credentialsJson);
    
    // Authenticate with Google
    const authClient = new auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Prepare data for Match Events tab
    const eventRows = matchData.events.map(event => [
      new Date().toISOString().split('T')[0],
      matchData.gameDetails.opponent || 'Unknown',
      event.timestamp,
      event.event,
      event.player,
      event.squadNum,
    ]);

    // Write to Match Events tab (GID: varies, but we'll append)
    if (eventRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Match Events!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: eventRows,
        },
      });
    }

    // Prepare data for Season Stats tab (player performance)
    const statsRows = matchData.startingXI
      .concat(
        matchData.playerStats 
          ? Object.entries(matchData.playerStats).map(([id, stats]) => ({
              id,
              ...stats
            }))
          : []
      )
      .filter(p => p.id)
      .map(player => [
        new Date().toISOString().split('T')[0],
        matchData.gameDetails.opponent || 'Unknown',
        player.firstName,
        player.surname,
        player.squadNum,
        matchData.playerStats?.[player.id]?.goals || 0,
        matchData.playerStats?.[player.id]?.assists || 0,
        matchData.playerStats?.[player.id]?.yellow || 0,
        matchData.playerStats?.[player.id]?.red || 0,
        matchData.playerStats?.[player.id]?.minutesPlayed || 0,
        matchData.playerStats?.[player.id]?.motm || 0,
      ]);

    if (statsRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Season Stats!A:K',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: statsRows,
        },
      });
    }

    // Write to Match History tab
    const matchHistoryRow = [
      new Date().toISOString().split('T')[0],
      matchData.gameDetails.opponent || 'Unknown',
      matchData.gameDetails.location || 'Unknown',
      matchData.events.filter(e => e.event === 'Goal').length,
      matchData.events.filter(e => e.event === 'Yellow').length,
      matchData.events.filter(e => e.event === 'Red').length,
      Math.floor(matchData.totalTime / 60),
      matchData.formation,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Match History!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [matchHistoryRow],
      },
    });

    return {
      success: true,
      message: 'Data written to Google Sheets',
      rowsWritten: {
        events: eventRows.length,
        stats: statsRows.length,
        matchHistory: 1,
      },
    };
  } catch (error) {
    console.error('Google Sheets write error:', error);
    throw new Error(`Failed to write to Google Sheets: ${error.message}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { matchData } = req.body;

    if (!matchData) {
      return res.status(400).json({ error: 'No match data provided' });
    }

    // Always log the data
    console.log('📊 Match Data Received:', {
      opponent: matchData.gameDetails.opponent,
      events: matchData.events.length,
      goals: matchData.events.filter(e => e.event === 'Goal').length,
      timestamp: new Date().toISOString(),
    });

    // Try to write to Google Sheets
    const sheetsResult = await writeToGoogleSheets(matchData);

    res.status(200).json({
      success: true,
      message: 'Match data saved',
      sheetsWrite: sheetsResult,
      data: {
        matchDate: new Date().toISOString(),
        eventsRecorded: matchData.events?.length || 0,
        goalsRecorded: matchData.events?.filter(e => e.event === 'Goal').length || 0,
        minutesTracked: matchData.playerTimes ? Object.keys(matchData.playerTimes).length : 0,
      },
    });
  } catch (error) {
    console.error('❌ Save match error:', error);
    res.status(500).json({ error: error.message });
  }
}
