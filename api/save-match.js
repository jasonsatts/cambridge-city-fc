import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// Google Sheet configuration — points at the rebuilt spreadsheet (Aug 2026).
// Schema: Players / Fixtures / Match History / Match Events / Match Player Stats
// / Season Stats. Season Stats is formula-driven from Match Player Stats and is
// NEVER written to directly — every write below is a plain append, on purpose,
// so Google Sheets' append-finds-the-next-empty-row behaviour always lands new
// rows exactly where expected (see README tab in the sheet for why that matters).
const SHEET_ID = '1gQjpR0bmxx2j4pqZN8F_kfm-VDPU4VojkO2gz-4A0hs';

/**
 * Writes match data to Google Sheets
 * Requires GOOGLE_SHEETS_CREDENTIALS environment variable with Service Account JSON
 */
async function writeToGoogleSheets(matchData) {
  try {
    const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credentialsJson) {
      console.log('⚠️  Google Sheets credentials not configured. Skipping write.');
      return { success: false, message: 'Credentials not configured' };
    }

    const credentials = JSON.parse(credentialsJson);
    // Was `new auth.GoogleAuth(...)` — the library's `auth` export is
    // already a singleton GoogleAuth instance, not a namespace containing a
    // constructor, so that threw "GoogleAuth is not a constructor" every
    // time. GoogleAuth itself is the class to instantiate.
    const authClient = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const matchCode = matchData.matchCode || 'UNKNOWN';
    const date = matchData.gameDetails?.date || new Date().toISOString().split('T')[0];
    const opponent = matchData.gameDetails?.opponent || 'Unknown';
    const location = matchData.gameDetails?.location || '';
    const kickOff = matchData.gameDetails?.kickOffTime || '';

    const ourScore = matchData.events.filter(e => e.event === 'Goal').length;
    const opponentScore = matchData.opponentScore || 0;
    const result = ourScore > opponentScore ? 'Win' : ourScore < opponentScore ? 'Loss' : 'Draw';

    // ---------------- Match History: one row, this match ----------------
    // valueInputOption is RAW everywhere in this file, not USER_ENTERED —
    // confirmed by a real test write that USER_ENTERED's "smart" parsing
    // mangled the formation "4-4-2" into the date "4-4-2002". RAW stores
    // exactly what's sent (numbers stay numbers, strings stay literal text),
    // which is what a programmatic integration actually wants.
    const matchHistoryRow = [
      matchCode, date, opponent, location, kickOff, matchData.formation,
      ourScore, opponentScore, result, '',
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Match History!A:J',
      valueInputOption: 'RAW',
      requestBody: { values: [matchHistoryRow] },
    });

    // ---------------- Match Events: one row per event, chronological ----------------
    // events are stored newest-first in the app (each new one unshifted onto the
    // front) — reverse so the sheet reads top-to-bottom in the order they happened.
    const chronological = [...matchData.events].reverse();
    const eventRows = chronological.map(event => [
      matchCode, date, opponent, event.timestamp, event.event,
      event.squadNum || '', event.player || '', '',
    ]);
    if (eventRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Match Events!A:H',
        valueInputOption: 'RAW',
        requestBody: { values: eventRows },
      });
    }

    // ---------------- Match Player Stats: one row per player who was in the squad ----------------
    // Union of starters + subs (not just starters) so anyone who was named for
    // this match gets a row — including unused subs, at 0 minutes.
    const squad = [...(matchData.startingXI || []), ...(matchData.subs || [])]
      .filter(p => p && p.id);
    const statsRows = squad.map(player => {
      const s = matchData.playerStats?.[player.id] || {};
      return [
        matchCode, date, opponent, player.squadNum, player.firstName, player.surname,
        s.minutesPlayed || 0, s.goals || 0, s.assists || 0, s.yellow || 0, s.red || 0, s.motm || 0,
      ];
    });
    if (statsRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Match Player Stats!A:L',
        valueInputOption: 'RAW',
        requestBody: { values: statsRows },
      });
    }

    return {
      success: true,
      message: 'Data written to Google Sheets',
      rowsWritten: {
        matchHistory: 1,
        events: eventRows.length,
        playerStats: statsRows.length,
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
    if (!matchData.matchCode) {
      return res.status(400).json({ error: 'matchCode is required — cannot save a match with no code' });
    }

    console.log('📊 Match Data Received:', {
      matchCode: matchData.matchCode,
      opponent: matchData.gameDetails?.opponent,
      events: matchData.events.length,
      timestamp: new Date().toISOString(),
    });

    const sheetsResult = await writeToGoogleSheets(matchData);

    // If the sheet write failed, say so plainly — this used to report
    // success:true even when nothing was actually saved, which is exactly
    // how a silent failure went unnoticed for a full season.
    if (!sheetsResult.success) {
      return res.status(502).json({
        success: false,
        message: 'Match data received but NOT saved to Google Sheets: ' + sheetsResult.message,
        sheetsWrite: sheetsResult,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Match data saved',
      sheetsWrite: sheetsResult,
      data: {
        matchDate: new Date().toISOString(),
        eventsRecorded: matchData.events?.length || 0,
        goalsRecorded: matchData.events?.filter(e => e.event === 'Goal').length || 0,
      },
    });
  } catch (error) {
    console.error('❌ Save match error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
