// Persistent match status tracker (Supabase-backed)
//
// WHY THIS CHANGED: Vercel serverless functions do not share memory between
// invocations. The coach's "start match" POST and a parent's polling GET can
// (and usually do) land on different function instances, so an in-memory
// object here never reliably tells parents the match has started. This now
// writes/reads a row in Supabase so every instance sees the same state.
//
// Falls back to in-memory (old, unreliable-in-prod behaviour) ONLY if
// Supabase env vars aren't configured, so this never hard-crashes.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const memoryMatches = {}; // fallback only

export default async function handler(req, res) {
  const { matchCode, action } = req.query;

  if (!matchCode) {
    return res.status(400).json({ error: 'matchCode required' });
  }

  if (req.method === 'POST') {
    if (action === 'start') {
      const { xi, subs, formation, gameDetails, periodLengthMinutes, numPeriods } = req.body || {};
      const payload = {
        match_code: matchCode,
        started: true,
        started_at: new Date().toISOString(),
        selected_xi: xi || [],
        selected_subs: subs || [],
        formation: formation || '4-4-2',
        // gameDetails/period format used to just never be sent at all — the
        // parent's device (which is the one that actually saves the match)
        // had no way to know the opponent, location, kick-off time, or
        // whether the coach had picked JPL's 4x20 quarters. Bundled as one
        // JSON column rather than several new ones since none of it needs
        // to be queried/filtered on its own.
        match_meta: {
          gameDetails: gameDetails || {},
          periodLengthMinutes: periodLengthMinutes || 40,
          numPeriods: numPeriods || 2,
        },
      };

      if (supabase) {
        const { error } = await supabase
          .from('match_status')
          .upsert(payload, { onConflict: 'match_code' });
        if (error) {
          console.error('Supabase upsert error:', error);
          return res.status(500).json({ error: 'Failed to persist match start', detail: error.message });
        }
      } else {
        memoryMatches[matchCode] = payload;
      }
      return res.status(200).json({ message: 'Match started', matchCode });
    }

    if (action === 'stop') {
      if (supabase) {
        const { error } = await supabase.from('match_status').delete().eq('match_code', matchCode);
        if (error) console.error('Supabase delete error:', error);
      } else {
        delete memoryMatches[matchCode];
      }
      return res.status(200).json({ message: 'Match stopped', matchCode });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method === 'GET') {
    let matchStatus = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('match_status')
        .select('*')
        .eq('match_code', matchCode)
        .maybeSingle();
      if (error) console.error('Supabase select error:', error);
      matchStatus = data;
    } else {
      matchStatus = memoryMatches[matchCode];
    }

    return res.status(200).json({
      matchCode,
      isActive: !!matchStatus?.started,
      startedAt: matchStatus?.started_at,
      selectedXI: matchStatus?.selected_xi || [],
      selectedSubs: matchStatus?.selected_subs || [],
      formation: matchStatus?.formation || '4-4-2',
      gameDetails: matchStatus?.match_meta?.gameDetails || {},
      periodLengthMinutes: matchStatus?.match_meta?.periodLengthMinutes || 40,
      numPeriods: matchStatus?.match_meta?.numPeriods || 2,
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
