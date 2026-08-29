import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Cache bust: Force Vercel rebuild
const COACH_PIN = '1234';
const FORMATIONS = {
  '4-4-2': { def: 4, mid: 4, fwd: 2 },
  '4-5-1': { def: 4, mid: 5, fwd: 1 },
  '4-3-3': { def: 4, mid: 3, fwd: 3 },
  '5-4-1': { def: 5, mid: 4, fwd: 1 },
  '3-5-2': { def: 3, mid: 5, fwd: 2 },
};

// Shareable team sheet ID generator
const generateTeamSheetId = () => 'TS-' + Math.random().toString(36).substring(2, 10).toUpperCase();

export default function App() {
  const [screen, setScreen] = useState('home');
  const [mode, setMode] = useState(null);
  const [matchCode, setMatchCode] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Game details
  const [gameDetails, setGameDetails] = useState({
    opponent: '',
    location: '',
    kickOffTime: '',
    date: '',
  });

  const [startingXI, setStartingXI] = useState([]);
  const [subs, setSubs] = useState([]);
  const [formation, setFormation] = useState('4-4-2');
  const [teamSheetId, setTeamSheetId] = useState(''); // Unique shareable link
  const [teamPublished, setTeamPublished] = useState(false); // Coach published team
  
  const [matchStarted, setMatchStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showEventsLog, setShowEventsLog] = useState(false);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [tapStartPos, setTapStartPos] = useState(null);
  const [matchTime, setMatchTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [half, setHalf] = useState(1);
  const [matchEnded, setMatchEnded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Persists (doesn't auto-clear like saveSuccess) so the summary screen can
  // tell "already saved, don't do it again" apart from "still in progress" —
  // needed now that saving is automatic, so a second manual tap of the Save
  // button can't accidentally append a duplicate set of rows to the sheet.
  const [hasSavedToSheet, setHasSavedToSheet] = useState(false);
  const [subToast, setSubToast] = useState(''); // visible confirmation after a substitution
  const [opponentScore, setOpponentScore] = useState(0); // goals conceded — not tied to any of our players
  // Match format: was hardcoded to 2×45 everywhere, which is why the clock went
  // negative at the start of the second period for a 2×40 match (and would have
  // been nonsense entirely for JPL's 4×20). Configurable at match setup instead.
  const [periodLengthMinutes, setPeriodLengthMinutes] = useState(40);
  const [numPeriods, setNumPeriods] = useState(2);
  // matchTime value at the moment the CURRENT period began. Was originally
  // computed as (half-1)*periodLengthMinutes*60 — i.e. assumed every prior
  // period ran for exactly its scheduled length. Confirmed by testing that
  // this breaks the instant a period runs long or short of schedule (which
  // is the entire point of stoppage time) — period 2 would start showing a
  // negative clock carrying over whatever the previous period was off by.
  // Recording the real matchTime at each transition fixes this regardless
  // of how long any period actually ran.
  const [periodStartTime, setPeriodStartTime] = useState(0);
  
  // ⏱️ TIME-ON-PITCH TRACKING
  const [playerTimes, setPlayerTimes] = useState({});
  const [currentlyOnPitch, setCurrentlyOnPitch] = useState(new Set());
  
  // MOTM: kept simple deliberately. There's no "other parents vote" model any
  // more — the coaching staff just tap the ⭐ Star Player button on whoever
  // they pick, live during/just after the match, the same way they log a
  // goal or a card. Whatever players have motm > 0 in `stats` at save time
  // are shown as MOTM on the summary screen — no separate voting state needed.

  // Timer interval — anchored to a wall-clock timestamp instead of just
  // counting ticks. A plain setInterval-only clock falls behind (or freezes
  // entirely) the moment the phone locks or the browser tab is backgrounded
  // — mobile browsers throttle or fully suspend JS timers to save battery,
  // and no web page can override that. What this CAN do: the instant the
  // phone is unlocked or the tab regains focus, snap the displayed clock to
  // the CORRECT elapsed time instead of staying stuck wherever it was when
  // it froze. Every time Play is pressed, `timerAnchorRef` records "what
  // matchTime was, and what the real time was, at that instant" — every
  // tick (and every visibility/focus event) recomputes matchTime from that
  // anchor via Date.now(), so missed ticks while backgrounded just get
  // caught up in one jump rather than silently lost.
  const timerAnchorRef = useRef(null);
  useEffect(() => {
    if (!timerRunning || matchEnded) {
      timerAnchorRef.current = null;
      return;
    }

    timerAnchorRef.current = { wallClock: Date.now(), matchTime };

    const sync = () => {
      if (!timerAnchorRef.current) return;
      const elapsedSec = Math.floor((Date.now() - timerAnchorRef.current.wallClock) / 1000);
      setMatchTime(timerAnchorRef.current.matchTime + elapsedSec);
    };

    const interval = setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, [timerRunning, matchEnded]);

  // Guard against losing the match data: if a save to Sheets is in flight
  // (auto-triggered at Full Time, or a manual retry) and someone closes the
  // tab or the phone locks/reloads, warn them first. Browsers show their own
  // generic "leave site?" prompt — the returnValue text itself is ignored by
  // modern browsers, but setting it is still required to trigger the prompt.
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    if (saving) {
      window.addEventListener('beforeunload', handler);
    }
    return () => window.removeEventListener('beforeunload', handler);
  }, [saving]);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/players');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.players || data.players.length === 0) {
        setError('No players found');
        setLoading(false);
        return;
      }

      setAllPlayers(data.players);

      const initialStats = {};
      data.players.forEach(p => {
        initialStats[p.id] = { 
          goals: 0, 
          assists: 0, 
          yellow: 0, 
          red: 0, 
          motm: 0,
          minutesPlayed: 0
        };
      });
      setStats(initialStats);
      setError('');
    } catch (err) {
      console.error('Error fetching players:', err);
      setError(`Failed to load players: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCoachPinSubmit = () => {
    if (pinInput === COACH_PIN) {
      setMode('coach');
      setPinInput('');
      setPinError('');
      setScreen('coach-setup');
      const newCode = 'CCFC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      setMatchCode(newCode);
    } else {
      setPinError('Incorrect PIN');
      setPinInput('');
    }
  };

  const handleParentCodeSubmit = (e) => {
    e.preventDefault();
    if (matchCode.trim() !== '') {
      setMode('parent');
      setScreen('parent-watch');
    }
  };

  const handleGameDetailsChange = (field, value) => {
    setGameDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectStartingXI = () => {
    if (startingXI.length === 11 && subs.length > 0) {
      setScreen('formation');
    }
  };

  const handleFormationSelect = () => {
    if (formation) {
      // Go to team sheet preview instead of straight to match
      setTeamSheetId(generateTeamSheetId());
      setScreen('team-sheet-preview');
    }
  };

  // Generate shareable team sheet link (URL-encoded, not localStorage dependent)
  const generateShareableLink = () => {
    const selectedXIPlayers = startingXI.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
    const selectedSubsPlayers = subs.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
    
    const lineupData = {
      startingXI: selectedXIPlayers,
      subs: selectedSubsPlayers,
      gameDetails,
      formation,
      matchCode,
      timestamp: new Date().toISOString()
    };
    
    // Encode lineup data into URL
    const encoded = btoa(JSON.stringify(lineupData));
    const baseUrl = window.location.origin;
    return `${baseUrl}?lineup=${encoded}`;
  };

  // Get formation config
  const getFormationConfig = () => FORMATIONS[formation];

  // x-position for the i-th player in a row of `count` players, evenly
  // spread across the pitch width. Was `15 + i * (count>1 ? 50/(count-1) : 0)`
  // inlined at every call site — for a row of exactly 1 (a lone striker in
  // 4-5-1/5-4-1, or any single-occupant row) that always evaluated to a flat
  // 15, pinning them to the left touchline instead of the centre. Centring
  // a lone player is the correct football default, so that's the fix.
  const rowX = (count, i) => {
    if (count === 1) return 40;
    return 15 + i * (50 / (count - 1));
  };

  // Pure version of the pitch-layout builder — takes an explicit XI list and
  // formation string instead of reading them off state, so it works equally
  // for the coach (who has them in local state already) and the parent's
  // poll handler (which only has them as fields on a fetch response, before
  // any state has actually been set this tick). Used to be duplicated almost
  // verbatim in both places, which is exactly how the centring bug above
  // ended up fixed in one copy and not the other the first time around.
  const buildPitchPlayersFrom = (xiList, formationStr) => {
    const formConfig = FORMATIONS[formationStr] || FORMATIONS['4-4-2'];
    const pitchPlayers = [];
    let playerIndex = 0;

    const gkPlayer = xiList[playerIndex];
    if (gkPlayer) {
      pitchPlayers.push({ ...gkPlayer, position: 'GK', x: 40, y: 120 });
      playerIndex++;
    }

    for (let i = 0; i < formConfig.def; i++) {
      const player = xiList[playerIndex];
      if (player) {
        pitchPlayers.push({ ...player, position: 'DEF', x: rowX(formConfig.def, i), y: 100 });
        playerIndex++;
      }
    }

    for (let i = 0; i < formConfig.mid; i++) {
      const player = xiList[playerIndex];
      if (player) {
        pitchPlayers.push({ ...player, position: 'MID', x: rowX(formConfig.mid, i), y: 65 });
        playerIndex++;
      }
    }

    for (let i = 0; i < formConfig.fwd; i++) {
      const player = xiList[playerIndex];
      if (player) {
        pitchPlayers.push({ ...player, position: 'FWD', x: rowX(formConfig.fwd, i), y: 30 });
        playerIndex++;
      }
    }

    return pitchPlayers;
  };

  // Build pitch players for display
  const buildPitchPlayers = () => {
    const xiList = startingXI.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
    return buildPitchPlayersFrom(xiList, formation);
  };

  // Continue to match start (after team sheet published)
  const handleContinueToMatch = () => {
    const pitchPlayers = buildPitchPlayers();
    const onPitch = new Set();
    const times = {};
    
    // Initialize time tracking for starting XI
    startingXI.forEach(id => {
      onPitch.add(id);
      times[id] = [{ onTime: 0, offTime: null, half: 1 }];
    });
    
    // Initialize subs (not on pitch yet)
    subs.forEach(subID => {
      times[subID] = [];
    });
    
    setPlayers(pitchPlayers);
    setCurrentlyOnPitch(onPitch);
    // Set players array from selected XI
    const xiPlayers = startingXI.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
    const subsPlayers = subs.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
    
    setPlayers(xiPlayers);
    setPlayerTimes(times);
    setMatchStarted(true);
    
    // Signal to parents that match has started (send XI/subs data)
    // Now also sends gameDetails and the match format — previously only
    // xi/subs/formation went over, so the parent's device (which is the one
    // that actually saves the match) never knew the opponent, location,
    // kick-off time, or how many periods/how long they were.
    fetch(`/api/match-status?matchCode=${matchCode}&action=start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xi: xiPlayers,
        subs: subsPlayers,
        formation: formation,
        gameDetails: gameDetails,
        periodLengthMinutes: periodLengthMinutes,
        numPeriods: numPeriods,
      })
    }).catch(e => console.log('Could not signal match start'));
    
    setScreen('team-published');
    setTeamPublished(true);
  };

  const handlePlayerMouseDown = (e, player) => {
    // Allow both coach and parent to tap
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    setTapStartPos({ x: clientX, y: clientY });
    setDraggedPlayer({ ...player, startX: clientX, startY: clientY });
  };

  const handleMouseMove = (e) => {
    if (!draggedPlayer || mode !== 'coach') return;
    
    const svg = document.querySelector('.pitch');
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * 80;
    const y = ((clientY - rect.top) / rect.height) * 130;
    
    setPlayers(players.map(p =>
      p.id === draggedPlayer.id ? { ...p, x: Math.max(10, Math.min(70, x)), y: Math.max(10, Math.min(125, y)) } : p
    ));
  };

  const handleMouseUp = (e) => {
    if (!draggedPlayer || !tapStartPos) return;
    
    const clientX = e.clientX || e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY || e.changedTouches?.[0]?.clientY;
    
    const distance = Math.sqrt(
      Math.pow(clientX - tapStartPos.x, 2) + 
      Math.pow(clientY - tapStartPos.y, 2)
    );
    
    if (distance < 10) {
      setSelectedPlayer(draggedPlayer);
      setShowActionModal(true);
    }
    
    setDraggedPlayer(null);
    setTapStartPos(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ---- Clock helpers -----------------------------------------------------
  // `matchTime` (seconds) counts up continuously from kickoff of period 1 and
  // never resets — that part was already right, and player-minutes tracking
  // depends on it staying that way. What was wrong was every *display* of it
  // subtracting a hardcoded 45 minutes to "re-zero" for the second half. That
  // only worked for a 2×45 match; for 2×40 it went negative the moment the
  // second period started, and it had no concept of more than two periods at
  // all. These two helpers are now the single source of truth for "how far
  // into the CURRENT period are we", including stoppage time once a period
  // runs past its scheduled length — every place that used to inline the old
  // formula now calls one of these instead.
  const getPeriodElapsedSeconds = () => {
    return matchTime - periodStartTime;
  };

  // For the big on-screen clock: "39:58" during normal time, "40+2:15" once
  // a period runs long (injuries, restarts, etc.).
  const formatPeriodClock = (elapsedSeconds) => {
    const periodLenSec = periodLengthMinutes * 60;
    if (elapsedSeconds <= periodLenSec) return formatTime(elapsedSeconds);
    const extra = elapsedSeconds - periodLenSec;
    const extraMins = Math.floor(extra / 60);
    const extraSecs = extra % 60;
    return `${periodLengthMinutes}+${extraMins}:${extraSecs.toString().padStart(2, '0')}`;
  };

  // For event timestamps logged against a player/opponent goal, e.g. "22'04"
  // normally, "40+3'12" in stoppage — same idea, apostrophe style to match
  // how the rest of the app already writes match minutes.
  const getEventTimestamp = () => {
    const elapsed = getPeriodElapsedSeconds();
    const periodLenSec = periodLengthMinutes * 60;
    const secs = elapsed % 60;
    if (elapsed <= periodLenSec) {
      const mins = Math.floor(elapsed / 60);
      return `${mins}'${secs.toString().padStart(2, '0')}`;
    }
    const extraMins = Math.floor((elapsed - periodLenSec) / 60);
    return `${periodLengthMinutes}+${extraMins}'${secs.toString().padStart(2, '0')}`;
  };

  // "Half 1" reads naturally for a standard 2-period match; a 4-period
  // match (JPL's 4x20) reads as ordinal quarters, not "Period 2 of 4".
  const QUARTER_NAMES = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
  const getPeriodLabel = () => {
    if (numPeriods === 2) return `Half ${half}`;
    if (numPeriods === 4) return QUARTER_NAMES[half - 1] || `Period ${half} of ${numPeriods}`;
    return `Period ${half} of ${numPeriods}`;
  };

  const handleHalfTime = () => {
    setTimerRunning(false);
  };

  const handleFullTime = () => {
    setTimerRunning(false);
    setMatchEnded(true);
    
    // Calculate final minutes. Was: finalStats[playerId].minutesPlayed =
    // Math.floor(matchTime / 60) — i.e. it overwrote whoever was still on
    // the pitch with the RAW TOTAL MATCH DURATION, discarding both when
    // their current stint actually started AND any minutes already banked
    // from earlier stints (handleSubstitution correctly adds those when a
    // player comes OFF — this just never used that number). That's exactly
    // why every player still on the pitch at full-time showed the same
    // total-match-minutes figure regardless of when they'd come on, and why
    // substitutions during the match didn't show up in the final numbers.
    // Fixed to match the same "prior banked minutes + current stint" logic
    // getCurrentMinutes already uses correctly for the live in-match display.
    const finalStats = { ...stats };
    currentlyOnPitch.forEach(playerId => {
      if (playerTimes[playerId] && playerTimes[playerId].length > 0) {
        const lastSession = playerTimes[playerId][playerTimes[playerId].length - 1];
        if (lastSession.offTime === null) {
          const currentStintMinutes = Math.floor((matchTime - lastSession.onTime) / 60);
          const priorMinutes = finalStats[playerId]?.minutesPlayed || 0;
          finalStats[playerId] = {
            goals: 0, assists: 0, yellow: 0, red: 0, motm: 0,
            ...finalStats[playerId],
            minutesPlayed: priorMinutes + currentStintMinutes,
          };
        }
      }
    });
    setStats(finalStats);
    setScreen('summary');

    // Auto-save straight to Sheets the moment Full Time is pressed — no
    // separate button press needed in the normal path. finalStats is passed
    // explicitly rather than relying on the `stats` state closure, because
    // setStats() above hasn't been applied to this render yet (React batches
    // it) — reading `stats` here would silently miss the final minutes we
    // just calculated for anyone still on the pitch.
    handleSaveToSheet(finalStats);
  };

  const handleRestartSecondHalf = () => {
    // Generalized from "second half" to "whichever period comes next" —
    // needed for JPL's 4×20, and named this way (not renamed) so nothing
    // else calling it needs to change.
    // Record the real matchTime this period is starting from — NOT an
    // assumed "previous period ran exactly periodLengthMinutes" value. The
    // timer is paused (timerRunning false) for the whole time this button is
    // visible, so `matchTime` here is stable and safe to read directly.
    setPeriodStartTime(matchTime);
    setHalf(h => h + 1);
    setTimerRunning(true);
  };

  const recordEvent = (eventType) => {
    const timeStr = getEventTimestamp();
    
    const newEvent = {
      timestamp: timeStr,
      matchTime: matchTime,
      half: half,
      player: selectedPlayer.fullName,
      squadNum: selectedPlayer.squadNum,
      event: eventType,
    };
    const updatedEventsList = [newEvent, ...events];
    setEvents(updatedEventsList);
    // Sync events to localStorage for parents to see live updates
    localStorage.setItem('ccfc-events', JSON.stringify(updatedEventsList));

    const updatedStats = { ...stats };
    if (!updatedStats[selectedPlayer.id]) {
      updatedStats[selectedPlayer.id] = { goals: 0, assists: 0, yellow: 0, red: 0, motm: 0, minutesPlayed: 0 };
    }

    switch (eventType) {
      case 'Goal':
        updatedStats[selectedPlayer.id].goals += 1;
        break;
      case 'Assist':
        updatedStats[selectedPlayer.id].assists += 1;
        break;
      case 'Yellow':
        updatedStats[selectedPlayer.id].yellow += 1;
        break;
      case 'Red':
        updatedStats[selectedPlayer.id].red += 1;
        break;
      case 'MOTM':
        updatedStats[selectedPlayer.id].motm += 1;
        break;
    }

    setStats(updatedStats);
    setShowActionModal(false);
  };

  // Opposition scoring — deliberately separate from recordEvent, since a goal
  // conceded isn't tied to any of our players and has no selectedPlayer to
  // attach to. Logs the time (for Match Events) and bumps the running score.
  const recordOpponentGoal = () => {
    const timeStr = getEventTimestamp();

    const newEvent = {
      timestamp: timeStr,
      matchTime: matchTime,
      half: half,
      player: '',
      squadNum: '',
      event: 'Opposition Goal',
    };
    const updatedEventsList = [newEvent, ...events];
    setEvents(updatedEventsList);
    localStorage.setItem('ccfc-events', JSON.stringify(updatedEventsList));
    setOpponentScore(prev => prev + 1);
  };

  const handleSubstitution = (subPlayerID) => {
    const subPlayer = allPlayers.find(p => p.id === subPlayerID);
    const playerComingOff = selectedPlayer;
    if (!subPlayer || !playerComingOff) return;

    // Build both event records here directly instead of calling recordEvent()
    // twice in a row — two calls in the same handler both read the same
    // stale `events` snapshot, so the second setEvents() silently overwrote
    // the first and the "Sub Off" entry was getting lost every time.
    const timeStr = getEventTimestamp();

    const offEvent = {
      timestamp: timeStr,
      matchTime,
      half,
      player: playerComingOff.fullName || `${playerComingOff.firstName} ${playerComingOff.surname}`,
      squadNum: playerComingOff.squadNum,
      event: 'Sub Off',
    };
    const onEvent = {
      timestamp: timeStr,
      matchTime,
      half,
      player: subPlayer.fullName || `${subPlayer.firstName} ${subPlayer.surname}`,
      squadNum: subPlayer.squadNum,
      event: 'Sub On',
    };
    const updatedEventsList = [onEvent, offEvent, ...events];
    setEvents(updatedEventsList);
    localStorage.setItem('ccfc-events', JSON.stringify(updatedEventsList));

    const times = { ...playerTimes };
    if (times[playerComingOff.id] && times[playerComingOff.id].length > 0) {
      const lastSession = times[playerComingOff.id][times[playerComingOff.id].length - 1];
      if (lastSession.offTime === null) {
        lastSession.offTime = matchTime;
        const minsPlayed = Math.floor((matchTime - lastSession.onTime) / 60);
        
        const updatedStats = { ...stats };
        if (!updatedStats[playerComingOff.id]) {
          updatedStats[playerComingOff.id] = { goals: 0, assists: 0, yellow: 0, red: 0, motm: 0, minutesPlayed: 0 };
        }
        updatedStats[playerComingOff.id].minutesPlayed = 
          (updatedStats[playerComingOff.id].minutesPlayed || 0) + minsPlayed;
        setStats(updatedStats);
      }
    }
    
    if (!times[subPlayerID]) {
      times[subPlayerID] = [];
    }
    times[subPlayerID].push({ onTime: matchTime, offTime: null, half: half });
    
    const newOnPitch = new Set(currentlyOnPitch);
    newOnPitch.delete(playerComingOff.id);
    newOnPitch.add(subPlayerID);
    
    setPlayerTimes(times);
    setCurrentlyOnPitch(newOnPitch);
    
    const subPosition = playerComingOff.position;
    const updatedPlayers = players.map(p =>
      p.id === playerComingOff.id ? { ...subPlayer, position: subPosition, x: p.x, y: p.y } : p
    );
    setPlayers(updatedPlayers);

    // Visible confirmation — previously the modal just closed silently,
    // so a working substitution looked identical to a broken one.
    setSubToast(`🔄 ${subPlayer.firstName} ON · ${playerComingOff.firstName} OFF`);
    setTimeout(() => setSubToast(''), 3500);
    
    setSelectedPlayer(null);
    setShowActionModal(false);
  };

  const getCurrentMinutes = (playerId) => {
    if (!playerTimes[playerId]) return 0;
    let total = stats[playerId]?.minutesPlayed || 0;
    const sessions = playerTimes[playerId];
    if (sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1];
      if (lastSession.offTime === null) {
        const currentSessionMins = Math.floor((matchTime - lastSession.onTime) / 60);
        total += currentSessionMins;
      }
    }
    return total;
  };

  const handleSaveToSheet = async (statsOverride) => {
    setSaving(true);
    try {
      const matchData = {
        matchCode,
        timestamp: new Date().toISOString(),
        gameDetails,
        formation: formation,
        totalTime: matchTime,
        goals: events.filter(e => e.event === 'Goal').length,
        opponentScore,
        events: events,
        // Prefer the caller's fresher copy (handleFullTime passes the just-
        // computed finalStats) over component state, which may not have
        // caught up yet — see the comment in handleFullTime.
        playerStats: statsOverride || stats,
        playerTimes: playerTimes,
        startingXI: startingXI.map(id => allPlayers.find(p => p.id === id)),
        // Subs weren't included before, so anyone who came off the bench never
        // got a Match Player Stats row at all — needed now for "stats per game".
        subs: subs.map(id => allPlayers.find(p => p.id === id)),
      };

      const response = await fetch('/api/save-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchData }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || errBody.error || 'Failed to save');
      }
      
      setSaveSuccess(true);
      setHasSavedToSheet(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };


  // ========== PARENT POLLING FOR MATCH START ==========
  // Force rebuild v3 - clear vercel cache
  useEffect(() => {
    if (mode === 'parent' && screen === 'parent-watch' && matchCode) {
      const checkMatchStart = async () => {
        try {
          const response = await fetch(`/api/match-status?matchCode=${matchCode}`);
          if (response.ok) {
            const data = await response.json();
            if (data.isActive) {
              // Coach has started the match!
              // Build pitch players with positioning from XI data
              if (data.selectedXI && data.selectedXI.length > 0) {
                const formStr = data.formation || '4-4-2';
                setPlayers(buildPitchPlayersFrom(data.selectedXI, formStr));

                // Was missing entirely: the parent's device never received
                // gameDetails (opponent/location/kick-off), the real
                // formation, or the match format (period length / number of
                // periods) at all — only the squad. That's exactly why
                // today's saved match showed "Unknown" opponent, blank
                // location/kick-off, and 4-4-2 regardless of what was
                // actually picked (4-4-2 is just this component's hardcoded
                // initial state, never overwritten): the parent's device —
                // the one that actually performs the save — was working off
                // its own defaults the entire time. Same root cause as the
                // JPL quarters not showing: numPeriods/periodLengthMinutes
                // were never synced either, so a parent's device stayed on
                // the 2×40 default no matter what the coach picked.
                setFormation(formStr);
                if (data.gameDetails) setGameDetails(data.gameDetails);
                if (data.periodLengthMinutes) setPeriodLengthMinutes(data.periodLengthMinutes);
                if (data.numPeriods) setNumPeriods(data.numPeriods);

                // The parent's device never ran handleContinueToMatch() —
                // that only happens on the coach's device — so subs,
                // on-pitch tracking, and time tracking were never populated
                // here. That's why the substitute dropdown always showed
                // "no substitutes available" on a parent's phone even when
                // the coach had picked some, and why minutes played stayed
                // stuck at 0. Sync them now from the poll data.
                if (data.selectedSubs) {
                  setSubs(data.selectedSubs.map(p => p.id));
                }
                // Same gap as subs above: startingXI also never got set on
                // a parent's device, so the rolling-substitution eligibility
                // check (which needs the full starters+subs squad) only
                // ever saw the bench list here. Sync it too.
                setStartingXI(data.selectedXI.map(p => p.id));
                setCurrentlyOnPitch(new Set(data.selectedXI.map(p => p.id)));
                setPlayerTimes(prevTimes => {
                  // Only initialize once — don't stomp on times we've
                  // already been tracking locally across repeated polls.
                  if (Object.keys(prevTimes).length > 0) return prevTimes;
                  const times = {};
                  data.selectedXI.forEach(p => {
                    times[p.id] = [{ onTime: 0, offTime: null, half: 1 }];
                  });
                  (data.selectedSubs || []).forEach(p => {
                    times[p.id] = [];
                  });
                  return times;
                });
              }
              setMatchStarted(true);
              setScreen('match');
            }
          }
        } catch (e) {
          console.log('Checking for coach start...');
        }
      };
      
      // Poll every 1 second
      const interval = setInterval(checkMatchStart, 1000);
      return () => clearInterval(interval);
    }
    // `screen` MUST be a dependency here — this effect's own guard
    // (screen === 'parent-watch') is what's supposed to stop the polling
    // once the parent reaches the live match screen. Without `screen` in
    // this array, React never re-evaluates that guard after the first
    // render, so the interval it set up back on 'parent-watch' just kept
    // running forever — every second, for the rest of the match, silently
    // rebuilding the whole pitch from the ORIGINAL starting XI (the only
    // thing the server actually knows about) and stomping over every
    // substitution made since. A sub would flash correctly for well under
    // a second and then get reverted. Confirmed live: this was exactly
    // the bug where substituted players' names never stuck on the pitch.
  }, [mode, matchCode, screen]);

  // ========== CHECK FOR SHARED TEAM SHEET URL ==========
  const params = new URLSearchParams(window.location.search);
  const encodedLineup = params.get('lineup');

  // If someone is accessing via shared team sheet link, show read-only team sheet
  if (encodedLineup) {
    // Decode lineup data from URL
    let lineupData = null;
    try {
      const decoded = atob(encodedLineup);
      lineupData = JSON.parse(decoded);
    } catch (e) {
      console.log('Could not decode lineup data', e);
    }

    const selectedXI = lineupData?.startingXI || [];
    const selectedSubs = lineupData?.subs || [];
    const currentGameDetails = lineupData?.gameDetails || gameDetails;
    const currentFormation = lineupData?.formation || formation;
    const currentMatchCode = lineupData?.matchCode || matchCode;

    return (
      <div className="container team-sheet-container">
        <div className="team-sheet-screen">
          <h1>📋 Team Sheet (Cambridge City FC)</h1>
          
          <div style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text-secondary)' }}>
            <p>Share mode - Read Only</p>
          </div>

          {/* Match Code Display */}
          <div className="match-code-box">
            <p className="code-label">Match Code:</p>
            <div className="code-display">{currentMatchCode || 'CCFC-XXXXXX'}</div>
          </div>

          {/* Match Details */}
          <div className="team-sheet-header">
            <div className="match-detail">
              <span className="detail-label">Opponent:</span>
              <span className="detail-value">{currentGameDetails.opponent || '—'}</span>
            </div>
            <div className="match-detail">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{currentGameDetails.date || '—'}</span>
            </div>
            <div className="match-detail">
              <span className="detail-label">Kick-off:</span>
              <span className="detail-value">{currentGameDetails.kickOffTime || '—'}</span>
            </div>
            <div className="match-detail">
              <span className="detail-label">Location:</span>
              <span className="detail-value">{currentGameDetails.location || '—'}</span>
            </div>
            <div className="match-detail">
              <span className="detail-label">Formation:</span>
              <span className="detail-value">{currentFormation}</span>
            </div>
          </div>

          {/* Starting XI Cards */}
          <div className="starting-xi-section">
            <h2>Starting XI</h2>
            <div className="xi-cards-grid">
              {selectedXI.map(player => (
                <div key={player?.id} className="xi-card">
                  <div className="xi-photo">
                    <img 
                      src={`/players/${player?.firstName}_${player?.surname}_2.jpg`}
                      alt={`${player?.firstName} ${player?.surname}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="xi-photo-placeholder">👤</div>
                  </div>
                  <div className="xi-num">#{player?.squadNum}</div>
                  <div className="xi-name">{player?.firstName} {player?.surname}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Substitutes */}
          <div className="team-sheet-subs-section">
            <h2>Substitutes</h2>
            <div className="subs-grid">
              {selectedSubs.map(player => (
                <div key={player?.id} className="sub-card">
                  <div className="sub-photo">
                    <img 
                      src={`/players/${player?.firstName}_${player?.surname}_2.jpg`}
                      alt={`${player?.firstName} ${player?.surname}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="sub-photo-placeholder">👤</div>
                  </div>
                  <div className="sub-num">#{player?.squadNum}</div>
                  <div className="sub-name">{player?.firstName} {player?.surname}</div>
                </div>
              ))}
            </div>
          </div>

          <button 
            className="btn-primary"
            onClick={() => window.location.href = '/'}
            style={{ marginTop: '30px', width: '100%' }}
          >
            ← Return to Home
          </button>
        </div>
      </div>
    );
  }

  // ========== HOME SCREEN ==========
  if (screen === 'home') {
    return (
      <div className="home-container">
        <div className="home-content">
          <h1 className="home-title">⚽ Cambridge City FC</h1>
          <p className="home-subtitle">Match Tracker</p>

          <div className="access-grid">
            <div className="access-card coach-card">
              <h2>🏆 Coach</h2>
              <p>Setup & manage match</p>
              <div className="pin-input-wrapper">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="4"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleCoachPinSubmit()}
                  placeholder="Enter PIN"
                  className="pin-input"
                />
                <button onClick={handleCoachPinSubmit} className="btn-access">
                  Access →
                </button>
              </div>
              {pinError && <p className="pin-error">{pinError}</p>}
            </div>

            <div className="access-card parent-card">
              <h2>👥 Parents</h2>
              <p>Join live match</p>
              <form onSubmit={handleParentCodeSubmit} className="code-input-wrapper">
                <input
                  type="text"
                  value={matchCode}
                  onChange={(e) => setMatchCode(e.target.value.toUpperCase())}
                  placeholder="Match Code"
                  className="code-input"
                />
                <button type="submit" className="btn-access">
                  Join →
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== COACH SETUP ==========
  if (screen === 'coach-setup' && mode === 'coach') {
    return (
      <div className="container">
        <div className="setup-screen">
          <h1>⚙️ Match Setup</h1>
          
          <div className="form-section">
            <div className="form-group">
              <label>Opponent</label>
              <input
                type="text"
                value={gameDetails.opponent}
                onChange={(e) => handleGameDetailsChange('opponent', e.target.value)}
                placeholder="Team name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={gameDetails.location}
                onChange={(e) => handleGameDetailsChange('location', e.target.value)}
                placeholder="Pitch / Ground"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={gameDetails.date}
                onChange={(e) => handleGameDetailsChange('date', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Kick-off Time</label>
              <input
                type="time"
                value={gameDetails.kickOffTime}
                onChange={(e) => handleGameDetailsChange('kickOffTime', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Match Format</label>
              <div className="format-options">
                <button
                  type="button"
                  className={`format-btn ${numPeriods === 2 && periodLengthMinutes === 40 ? 'active' : ''}`}
                  onClick={() => { setNumPeriods(2); setPeriodLengthMinutes(40); }}
                >
                  2 × 40 min
                </button>
                <button
                  type="button"
                  className={`format-btn ${numPeriods === 4 && periodLengthMinutes === 20 ? 'active' : ''}`}
                  onClick={() => { setNumPeriods(4); setPeriodLengthMinutes(20); }}
                >
                  4 × 20 min (JPL)
                </button>
              </div>
            </div>
          </div>

          <button 
            className="btn-primary"
            onClick={() => setScreen('lineup')}
          >
            Continue → Select Team
          </button>
        </div>
      </div>
    );
  }

  // ========== LINEUP SELECTION (COACH ONLY) ==========
  if (screen === 'lineup' && mode === 'coach') {
    const availablePlayers = allPlayers.filter(
      p => !startingXI.includes(p.id) && !subs.includes(p.id)
    );
    const selectedStartingXI = startingXI.map(id => allPlayers.find(p => p.id === id));
    const selectedSubs = subs.map(id => allPlayers.find(p => p.id === id));

    return (
      <div className="container">
        <div className="setup-screen">
          <h1>⚽ Select Starting XI & Substitutes</h1>

          <div className="selection-grid">
            <div className="selection-section">
              <h2>Starting XI (11 Players)</h2>
              <div className="player-list">
                {selectedStartingXI.map((player, idx) => (
                  <div key={idx} className="selected-player">
                    <span>#{idx + 1}</span>
                    <span>{player?.firstName} {player?.surname}</span>
                    <button onClick={() => setStartingXI(startingXI.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                {startingXI.length < 11 && (
                  <select className="player-dropdown" onChange={(e) => {
                    if (e.target.value) {
                      setStartingXI([...startingXI, parseInt(e.target.value)]);
                      e.target.value = '';
                    }
                  }}>
                    <option value="">+ Add Player ({startingXI.length}/11)</option>
                    {availablePlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.surname} (#{p.squadNum})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="selection-section">
              <h2>Substitutes (Min. 1)</h2>
              <div className="player-list">
                {selectedSubs.map((player, idx) => (
                  <div key={idx} className="selected-player">
                    <span>Sub {idx + 1}</span>
                    <span>{player?.firstName} {player?.surname}</span>
                    <button onClick={() => setSubs(subs.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                <select className="player-dropdown" onChange={(e) => {
                  if (e.target.value) {
                    setSubs([...subs, parseInt(e.target.value)]);
                    e.target.value = '';
                  }
                }}>
                  <option value="">+ Add Substitute ({subs.length} added)</option>
                  {availablePlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.surname} (#{p.squadNum})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleSelectStartingXI}
            disabled={startingXI.length !== 11 || subs.length === 0}
          >
            Continue → Select Formation ({startingXI.length}/11)
          </button>
        </div>
      </div>
    );
  }

  // ========== FORMATION SELECTION (COACH ONLY) ==========
  if (screen === 'formation' && mode === 'coach') {
    return (
      <div className="container">
        <div className="formation-screen">
          <h1>📋 Select Formation</h1>
          <div className="formation-grid">
            {Object.keys(FORMATIONS).map(form => (
              <button
                key={form}
                className={`formation-btn ${formation === form ? 'active' : ''}`}
                onClick={() => setFormation(form)}
              >
                {form}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={handleFormationSelect}>
            Preview Team Sheet →
          </button>
        </div>
      </div>
    );
  }

  // ========== TEAM SHEET PREVIEW (NEW - SHAREABLE) ==========
  if (screen === 'team-sheet-preview' && mode === 'coach') {
    const selectedXI = startingXI.map(id => allPlayers.find(p => p.id === id));
    const selectedSubs = subs.map(id => allPlayers.find(p => p.id === id));
    const shareableUrl = generateShareableLink();

    return (
      <div className="container team-sheet-container">
        <div className="team-sheet-screen">
          <h1>📋 Team Sheet</h1>

          {/* Match Code Box - Prominent */}
          <div className="match-code-box">
            <p className="code-label">Match Code for Parents:</p>
            <div className="code-display">{matchCode || 'CCFC-XXXXXX'}</div>
            <p className="code-hint">Parents use this to join</p>
          </div>

          {/* Match Details */}
          <div className="team-sheet-header">
            <div className="match-detail">
              <span className="detail-label">Opponent:</span>
              <span className="detail-value">{gameDetails.opponent || '—'}</span>
            </div>
            <div className="match-detail">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{gameDetails.date || '—'}</span>
            </div>
            <div className="match-detail">
              <span className="detail-label">Kick-off:</span>
              <span className="detail-value">{gameDetails.kickOffTime || '—'}</span>
            </div>
            <div className="match-detail">
              <span className="detail-label">Location:</span>
              <span className="detail-value">{gameDetails.location || '—'}</span>
            </div>
            <div className="match-detail">
              <span className="detail-label">Formation:</span>
              <span className="detail-value">{formation}</span>
            </div>
          </div>

          {/* Starting XI Cards */}
          <div className="starting-xi-section">
            <h2>Starting XI</h2>
            <div className="xi-cards-grid">
              {selectedXI.map(player => (
                <div key={player.id} className="xi-card">
                  <div className="xi-photo">
                    <img 
                      src={`/players/${player.firstName}_${player.surname}_2.jpg`}
                      alt={`${player.firstName} ${player.surname}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="xi-photo-placeholder">👤</div>
                  </div>
                  <div className="xi-num">#{player.squadNum}</div>
                  <div className="xi-name">{player.firstName} {player.surname}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Substitutes */}
          <div className="team-sheet-subs-section">
            <h2>Substitutes</h2>
            <div className="subs-grid">
              {selectedSubs.map(player => (
                <div key={player.id} className="sub-card">
                  <div className="sub-photo">
                    <img 
                      src={`/players/${player.firstName}_${player.surname}_2.jpg`}
                      alt={`${player.firstName} ${player.surname}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="sub-photo-placeholder">👤</div>
                  </div>
                  <div className="sub-num">#{player.squadNum}</div>
                  <div className="sub-name">{player.firstName} {player.surname}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Share Options */}
          <div className="share-section">
            <h2>📤 Share Team Sheet</h2>
            <p className="share-subtitle">Send link to parents before the match</p>
            
            <div className="share-link-box">
              <input 
                type="text" 
                value={shareableUrl} 
                readOnly 
                className="share-link-input"
              />
              <button 
                className="btn-copy"
                onClick={() => {
                  navigator.clipboard.writeText(shareableUrl);
                  alert('Link copied to clipboard!');
                }}
              >
                📋 Copy Link
              </button>
            </div>

            <div className="share-buttons">
              <button 
                className="btn-share"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${gameDetails.opponent} - Team Sheet`,
                      text: `View the team selection for Cambridge City FC`,
                      url: shareableUrl
                    });
                  } else {
                    alert('Share not supported on this device');
                  }
                }}
              >
                🔗 Share Link
              </button>
              <button 
                className="btn-share"
                onClick={() => window.print()}
              >
                🖨️ Print / PDF
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="team-sheet-actions">
            <button 
              className="btn-primary"
              onClick={handleContinueToMatch}
            >
              ✅ Publish Team Sheet
            </button>
            <button 
              className="btn-secondary"
              onClick={() => setScreen('formation')}
            >
              ← Change Formation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== TEAM PUBLISHED (COACH'S JOB IS DONE) ==========
  // Replaces the old "Designate Stats Person" step — nobody's formally
  // assigned as stats tracker any more; the coaching staff sort that out
  // themselves, and whichever parent has the phone presses ▶ on the live
  // match screen to kick off. The coach doesn't need to do anything else
  // from here until full-time.
  if (screen === 'team-published' && mode === 'coach') {
    const shareableUrl = generateShareableLink();
    return (
      <div className="container">
        <div className="team-published-screen">
          <h1>✅ Team Published</h1>
          <p className="stats-subtitle">
            Parents can join now. Whoever's doing stats today presses ▶ on the
            match screen when kickoff happens — you're all set.
          </p>

          <div className="match-code-box">
            <p className="code-label">Match Code for Parents:</p>
            <div className="code-display">{matchCode || 'CCFC-XXXXXX'}</div>
            <p className="code-hint">Parents enter this under "Parents → Join"</p>
          </div>

          <div className="share-section">
            <div className="share-link-box">
              <input type="text" value={shareableUrl} readOnly className="share-link-input" />
              <button
                className="btn-copy"
                onClick={() => {
                  navigator.clipboard.writeText(shareableUrl);
                  alert('Link copied to clipboard!');
                }}
              >
                📋 Copy Link
              </button>
            </div>
            <div className="share-buttons">
              <button
                className="btn-share"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${gameDetails.opponent} - Team Sheet`,
                      text: `View the team selection for Cambridge City FC`,
                      url: shareableUrl,
                    });
                  } else {
                    alert('Share not supported on this device');
                  }
                }}
              >
                🔗 Share Link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== MATCH SCREEN (COACH ONLY) ==========
  if (screen === 'match' && matchStarted && (mode === 'coach' || mode === 'parent')) {
    const displayTime = getPeriodElapsedSeconds();
    const isFinalPeriod = half >= numPeriods;
    
    return (
      <div 
        className="match-container"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <div className="match-header">
          <div className="timer-display">
            <div className="time">{formatPeriodClock(displayTime)}</div>
            <div className="half">{getPeriodLabel()}</div>
          </div>
          <div className="match-controls-header">
            {/* Was coach-only. In practice the coach hands off after kickoff and
                never touches their device again until full-time — the parent
                doing live stats-tracking needs to be the one who can pause,
                go to half-time, and end the match, or nobody ever can. */}
            {(mode === 'coach' || mode === 'parent') && !matchEnded ? (
              <>
                <button 
                  className={`btn-timer ${timerRunning ? 'active' : ''}`}
                  onClick={() => setTimerRunning(!timerRunning)}
                >
                  {timerRunning ? '⏸' : '▶'}
                </button>
                {/* Was also showing ⏸ — identical to the play/pause toggle
                    right next to it, so it looked like a duplicate button.
                    This one ends the half, not pauses the clock — give it
                    its own icon and a label so that's obvious at a glance. */}
                {!isFinalPeriod && (
                  <button className="btn-timer btn-half" onClick={handleHalfTime}>
                    ⏹ {numPeriods === 2 ? 'End Half' : 'End Quarter'}
                  </button>
                )}
                {isFinalPeriod && (
                  <button className="btn-timer btn-full" onClick={handleFullTime}>
                    🏁
                  </button>
                )}
              </>
            ) : matchEnded ? (
              <div className="full-time-label">🏁</div>
            ) : (
              <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Live Match</div>
            )}
          </div>
        </div>

        {!timerRunning && !isFinalPeriod && matchTime > 0 && (
          <div className="half-time-banner">
            <h2>⏸ {numPeriods === 2 ? 'HALF TIME' : `END OF ${QUARTER_NAMES[half - 1]?.toUpperCase() || `PERIOD ${half}`}`}</h2>
            <button className="btn-restart" onClick={handleRestartSecondHalf}>
              Start {numPeriods === 2 ? '2nd Half' : (QUARTER_NAMES[half] || `Period ${half + 1}`)} ▶
            </button>
          </div>
        )}

        <div className="pitch-wrapper">
          <svg viewBox="0 0 80 130" className="pitch" style={{ cursor: draggedPlayer ? 'grabbing' : 'grab' }}>
            <defs>
              <linearGradient id="pitchGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2f6e1c" />
                <stop offset="100%" stopColor="#234f14" />
              </linearGradient>
              <radialGradient id="badgeGradient" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#FF9A8B" />
                <stop offset="55%" stopColor="#FF6B6B" />
                <stop offset="100%" stopColor="#D94848" />
              </radialGradient>
              <filter id="badgeShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0.6" stdDeviation="0.9" floodColor="#000000" floodOpacity="0.45" />
              </filter>
            </defs>
            <rect width="80" height="130" fill="url(#pitchGradient)" />
            {/* mow stripes */}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <rect key={i} x="0" y={i * (130 / 6)} width="80" height={130 / 6} fill="#ffffff" opacity={i % 2 === 0 ? 0.03 : 0} />
            ))}
            <line x1="0" y1="0" x2="80" y2="0" stroke="white" strokeWidth="0.5" opacity="0.9" />
            <line x1="0" y1="130" x2="80" y2="130" stroke="white" strokeWidth="0.5" opacity="0.9" />
            <line x1="0" y1="0" x2="0" y2="130" stroke="white" strokeWidth="0.5" opacity="0.9" />
            <line x1="80" y1="0" x2="80" y2="130" stroke="white" strokeWidth="0.5" opacity="0.9" />
            <line x1="0" y1="65" x2="80" y2="65" stroke="white" strokeWidth="0.4" opacity="0.9" />
            <circle cx="40" cy="65" r="10" stroke="white" strokeWidth="0.3" fill="none" opacity="0.9" />
            <circle cx="40" cy="65" r="0.8" fill="white" opacity="0.9" />
            <rect x="15" y="0" width="50" height="18" stroke="white" strokeWidth="0.3" fill="none" opacity="0.9" />
            <rect x="15" y="112" width="50" height="18" stroke="white" strokeWidth="0.3" fill="none" opacity="0.9" />

            {players.map((player) => (
              <g 
                key={player.id}
                onMouseDown={(e) => handlePlayerMouseDown(e, player)}
                onTouchStart={(e) => handlePlayerMouseDown(e, player)}
                style={{ cursor: 'grab' }}
                filter="url(#badgeShadow)"
              >
                <circle cx={player.x} cy={player.y} r="8.5" fill="url(#badgeGradient)" stroke="white" strokeWidth="1" />
                <circle cx={player.x} cy={player.y} r="7.6" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
                <text x={player.x} y={player.y + 0.8} textAnchor="middle" fill="white" fontSize="3.2" fontWeight="900" style={{ pointerEvents: 'none', letterSpacing: '-0.1' }}>
                  {player.squadNum}
                </text>
                <text x={player.x} y={player.y + 5.5} textAnchor="middle" fill="white" fontSize="2.1" fontWeight="700" style={{ pointerEvents: 'none' }}>
                  {player.firstName?.substring(0, 6)}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="match-controls">
          <div className="live-score">
            <span className="live-score-us">Us {events.filter(e => e.event === 'Goal').length}</span>
            <span className="live-score-sep">–</span>
            <span className="live-score-them">{opponentScore} Them</span>
          </div>
          {!matchEnded && (
            <button className="btn-control btn-opp-goal" onClick={recordOpponentGoal}>
              ⚽ Opposition Goal
            </button>
          )}
          <button className="btn-control" onClick={() => setShowEventsLog(!showEventsLog)}>
            📋 Events ({events.length})
          </button>
        </div>

        {showEventsLog && (
          <div className="events-sheet">
            <div className="events-header">
              <h3>Match Events</h3>
              <button className="close-btn" onClick={() => setShowEventsLog(false)}>✕</button>
            </div>
            <div className="events-list">
              {events.map((event, idx) => (
                <div key={idx} className="event-item">
                  <span className="time">{event.timestamp}</span>
                  <span className="event">{event.event}</span>
                  <span className="player">#{event.squadNum}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {subToast && (
          <div className="sub-toast">{subToast}</div>
        )}

        {showActionModal && selectedPlayer && (() => {
          // Rolling subs: eligibility is the WHOLE named squad (starters +
          // bench), not just the original bench list. `subs` alone only
          // ever contains the players picked as substitutes before kickoff,
          // so once a starter was subbed off she'd vanish from every future
          // dropdown — and once the one original sub had been used, nobody
          // was ever eligible again. Grassroots matches roll subs freely
          // (same player can go on and off repeatedly), so anyone in
          // today's squad who isn't currently on the pitch is fair game.
          const fullSquadIDs = [...new Set([...startingXI, ...subs])];
          const availableSubs = fullSquadIDs.filter(id => !currentlyOnPitch.has(id));
          return (
          <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>#{selectedPlayer.squadNum} {selectedPlayer.firstName}</h2>
              <p className="squad-name">{selectedPlayer.surname}</p>
              <p className="player-time">⏱️ {getCurrentMinutes(selectedPlayer.id)} mins</p>

              <div className="action-buttons">
                <button onClick={() => recordEvent('Goal')} className="btn-action btn-goal">
                  <span className="btn-action-icon">⚽</span>
                  <span className="btn-action-label">Goal</span>
                </button>
                <button onClick={() => recordEvent('Assist')} className="btn-action btn-assist">
                  <span className="btn-action-icon">🅰️</span>
                  <span className="btn-action-label">Assist</span>
                </button>
                <button onClick={() => recordEvent('Yellow')} className="btn-action btn-yellow">
                  <span className="btn-action-icon">🟨</span>
                  <span className="btn-action-label">Yellow</span>
                </button>
                <button onClick={() => recordEvent('Red')} className="btn-action btn-red">
                  <span className="btn-action-icon">🟥</span>
                  <span className="btn-action-label">Red</span>
                </button>
                <button onClick={() => recordEvent('MOTM')} className="btn-action btn-motm">
                  <span className="btn-action-icon">⭐</span>
                  <span className="btn-action-label">Star Player</span>
                </button>
              </div>

              <div className="sub-section">
                <label>Substitute</label>
                {availableSubs.length === 0 ? (
                  <p className="sub-empty">No substitutes available — everyone's already on the pitch.</p>
                ) : (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleSubstitution(parseInt(e.target.value, 10));
                      e.target.value = '';
                    }}
                    className="sub-dropdown"
                  >
                    <option value="">Bring on a substitute…</option>
                    {availableSubs.map(subID => {
                      const subPlayer = allPlayers.find(p => p.id === subID);
                      return (
                        <option key={subID} value={subID}>
                          #{subPlayer?.squadNum} {subPlayer?.firstName} {subPlayer?.surname} · {getCurrentMinutes(subID)}′ played
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <button onClick={() => setShowActionModal(false)} className="btn-close">Close</button>
            </div>
          </div>
          );
        })()}
      </div>
    );
  }

  // ========== PARENT WATCH (READ-ONLY) ==========
  if (screen === 'parent-watch' && mode === 'parent') {
    const displayTime = getPeriodElapsedSeconds();
    
    // LIVE MATCH WATCH
    return (
      <div className="container">
        <div className="parent-watch-screen">
          <h1>⚽ Live Match</h1>
          <p className="match-code-small">Code: {matchCode}</p>
          
          {!matchStarted ? (
            <div className="waiting-message">
              <p>Waiting for coach to start match...</p>
            </div>
          ) : (
            <>
              <div className="live-timer">
                <div className="time-display">{formatPeriodClock(displayTime)}</div>
                <div className="half-display">{getPeriodLabel()}</div>
              </div>

              <div className="current-xi-section">
                <h3>On Pitch</h3>
                <div className="players-grid">
                  {players.map(p => (
                    <div key={p.id} className="player-badge">
                      <div className="badge-num">#{p.squadNum}</div>
                      <div className="badge-name">{p.firstName}</div>
                      <div className="badge-time">⏱️ {getCurrentMinutes(p.id)}'</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="events-preview">
                <h3>Recent Events</h3>
                {events.length === 0 ? (
                  <p className="no-events">No events yet</p>
                ) : (
                  <div className="events-list">
                    {events.slice(0, 5).map((event, idx) => (
                      <div key={idx} className="event-item">
                        <span className="time">{event.timestamp}</span>
                        <span className="event">{event.event}</span>
                        <span className="player">#{event.squadNum}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ========== SUMMARY SCREEN ==========
  // Was coach-only — same fix as the timer controls above, so whichever
  // device actually ran the match (usually the parent) can reach Full Time
  // and press Save.
  if (screen === 'summary' && matchEnded && (mode === 'coach' || mode === 'parent')) {
    const goals = events.filter(e => e.event === 'Goal').length;
    const assists = events.filter(e => e.event === 'Assist').length;
    const cards = events.filter(e => e.event === 'Yellow' || e.event === 'Red').length;

    const playersWithMinutes = startingXI.map(id => allPlayers.find(p => p.id === id))
      .concat(subs.map(id => allPlayers.find(p => p.id === id)))
      .map(p => ({
        ...p,
        minutes: stats[p.id]?.minutesPlayed || 0
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const finalResult = goals > opponentScore ? 'Win' : goals < opponentScore ? 'Loss' : 'Draw';

    // No more post-match voting — MOTM is whoever got tapped as ⭐ Star Player
    // live during the match (same mechanic as goals/cards). If more than one
    // got starred, show all of them rather than silently picking one.
    const motmPlayers = playersWithMinutes.filter(p => (stats[p.id]?.motm || 0) > 0);

    return (
      <div className="container">
        <div className="summary-screen">
          <h1>🏁 Match Summary</h1>

          <div className={`final-score-banner result-${finalResult.toLowerCase()}`}>
            <span className="final-score-opponent">{gameDetails.opponent || 'Opponent'}</span>
            <span className="final-score-line">{goals} – {opponentScore}</span>
            <span className="final-score-result">{finalResult}</span>
          </div>

          {motmPlayers.length > 0 && (
            <div className="motm-summary-banner">
              ⭐ {motmPlayers.map(p => `#${p.squadNum} ${p.firstName} ${p.surname}`).join(', ')}
            </div>
          )}

          <div className="summary-stats">
            <div className="stat-card">
              <div className="stat-value">{goals}</div>
              <div className="stat-label">Goals</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{assists}</div>
              <div className="stat-label">Assists</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{cards}</div>
              <div className="stat-label">Cards</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{events.length}</div>
              <div className="stat-label">Events</div>
            </div>
          </div>

          <div className="summary-section">
            <h2>Player Minutes</h2>
            <div className="minutes-table">
              <div className="table-header">
                <div>Player</div>
                <div>Minutes</div>
              </div>
              {playersWithMinutes.map(p => (
                <div key={p.id} className="table-row">
                  <div>#{p.squadNum} {p.firstName} {p.surname}</div>
                  <div className="minutes-badge">{p.minutes}'</div>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-section">
            <h2>Match Timeline</h2>
            <div className="events-list">
              {events.map((event, idx) => (
                <div key={idx} className="event-item">
                  <span className="time">{event.timestamp} (H{event.half})</span>
                  <span className="event">{event.event}</span>
                  <span className="player">#{event.squadNum}</span>
                </div>
              ))}
            </div>
          </div>

          {saveSuccess && (
            <div className="success-banner">✅ Saved!</div>
          )}

          <div className="summary-buttons">
            {/* Saving is automatic the moment Full Time is pressed (see
                handleFullTime) — this button now only shows when there's
                actually something to do: still in progress, or a retry after
                a failed auto-save. Once hasSavedToSheet is true we show a
                fixed confirmation instead, so a second tap can't append a
                duplicate set of rows to the sheet. */}
            {hasSavedToSheet ? (
              <div className="success-banner">✅ Saved to Sheets</div>
            ) : (
              <button
                className="btn-primary"
                onClick={() => handleSaveToSheet()}
                disabled={saving}
              >
                {saving ? '💾 Saving...' : '💾 Retry Save to Sheets'}
              </button>
            )}
            <button 
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              🔄 New Match
            </button>
          </div>
        </div>
      </div>
    );
  }
}
