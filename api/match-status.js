// Simple in-memory match status tracker
// Stores match state per match code so parents can poll for coach start

const activeMatches = {};

export default function handler(req, res) {
  const { matchCode, action } = req.query;

  if (!matchCode) {
    return res.status(400).json({ error: 'matchCode required' });
  }

  if (req.method === 'POST') {
    // Coach calls this when starting/stopping match
    if (action === 'start') {
      activeMatches[matchCode] = {
        started: true,
        startedAt: new Date().toISOString(),
      };
      return res.status(200).json({ message: 'Match started', matchCode });
    } else if (action === 'stop') {
      delete activeMatches[matchCode];
      return res.status(200).json({ message: 'Match stopped', matchCode });
    }
  }

  if (req.method === 'GET') {
    // Parent calls this to check if coach has started
    const matchStatus = activeMatches[matchCode];
    return res.status(200).json({
      matchCode,
      isActive: !!matchStatus,
      startedAt: matchStatus?.startedAt,
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
