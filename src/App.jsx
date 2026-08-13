import React, { useState, useEffect } from 'react';
import './App.css';

// Cache bust: Force Vercel rebuild
const COACH_PIN = '1234';
const FORMATIONS = {
  '1-4-4-2': { def: 4, mid: 4, fwd: 2 },
  '1-4-5-1': { def: 4, mid: 5, fwd: 1 },
  '1-4-3-3': { def: 4, mid: 3, fwd: 3 },
  '1-5-4-1': { def: 5, mid: 4, fwd: 1 },
  '1-3-5-2': { def: 3, mid: 5, fwd: 2 },
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
  const [formation, setFormation] = useState('1-4-4-2');
  const [teamSheetId, setTeamSheetId] = useState(''); // Unique shareable link
  const [statsPerson, setStatsPerson] = useState(null); // Who tracks the match
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
  const [subToast, setSubToast] = useState(''); // visible confirmation after a substitution
  
  // ⏱️ TIME-ON-PITCH TRACKING
  const [playerTimes, setPlayerTimes] = useState({});
  const [currentlyOnPitch, setCurrentlyOnPitch] = useState(new Set());
  
  // 👑 MOTM VOTING
  const [motmVotes, setMotmVotes] = useState({});
  const [userMotmVote, setUserMotmVote] = useState(null);

  // Timer interval
  useEffect(() => {
    let interval;
    if (timerRunning && !matchEnded) {
      interval = setInterval(() => {
        setMatchTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, matchEnded]);

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

  // Build pitch players for display
  const buildPitchPlayers = () => {
    const formConfig = getFormationConfig();
    const pitchPlayers = [];
    let playerIndex = 0;
    
    // GK (bottom, defending y: 120)
    const gkPlayer = allPlayers.find(p => p.id === startingXI[playerIndex]);
    pitchPlayers.push({
      ...gkPlayer,
      position: 'GK',
      x: 40,
      y: 120,
    });
    playerIndex++;
    
    // DEF (back row, y: 100)
    const defY = 100;
    for (let i = 0; i < formConfig.def; i++) {
      const player = allPlayers.find(p => p.id === startingXI[playerIndex]);
      const defSpacing = formConfig.def > 1 ? 50 / (formConfig.def - 1) : 0;
      pitchPlayers.push({
        ...player,
        position: 'DEF',
        x: 15 + i * defSpacing,
        y: defY,
      });
      playerIndex++;
    }
    
    // MID (midfield row, y: 65)
    const midY = 65;
    for (let i = 0; i < formConfig.mid; i++) {
      const player = allPlayers.find(p => p.id === startingXI[playerIndex]);
      const midSpacing = formConfig.mid > 1 ? 50 / (formConfig.mid - 1) : 0;
      pitchPlayers.push({
        ...player,
        position: 'MID',
        x: 15 + i * midSpacing,
        y: midY,
      });
      playerIndex++;
    }
    
    // FWD (top, attacking y: 30)
    const fwdY = 30;
    for (let i = 0; i < formConfig.fwd; i++) {
      const player = allPlayers.find(p => p.id === startingXI[playerIndex]);
      const fwdSpacing = formConfig.fwd > 1 ? 50 / (formConfig.fwd - 1) : 0;
      pitchPlayers.push({
        ...player,
        position: 'FWD',
        x: 15 + i * fwdSpacing,
        y: fwdY,
      });
      playerIndex++;
    }
    
    return pitchPlayers;
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
    
    fetch(`/api/match-status?matchCode=${matchCode}&action=start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xi: xiPlayers,
        subs: subsPlayers,
        formation: formation
      })
    }).catch(e => console.log('Could not signal match start'));
    
    setScreen('select-stats-person');
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

  const handleHalfTime = () => {
    setTimerRunning(false);
  };

  const handleFullTime = () => {
    setTimerRunning(false);
    setMatchEnded(true);
    
    // Calculate final minutes
    const finalStats = { ...stats };
    currentlyOnPitch.forEach(playerId => {
      if (playerTimes[playerId] && playerTimes[playerId].length > 0) {
        const lastSession = playerTimes[playerId][playerTimes[playerId].length - 1];
        if (lastSession.offTime === null) {
          const minutes = Math.floor(matchTime / 60);
          finalStats[playerId].minutesPlayed = minutes;
        }
      }
    });
    setStats(finalStats);
    setScreen('summary');
  };

  const handleRestartSecondHalf = () => {
    setHalf(2);
    setTimerRunning(true);
  };

  const recordEvent = (eventType) => {
    const displayTime = half === 1 ? matchTime : matchTime - (45 * 60);
    const mins = Math.floor(displayTime / 60);
    const secs = displayTime % 60;
    const timeStr = `${mins}'${secs.toString().padStart(2, '0')}`;
    
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

  const handleSubstitution = (subPlayerID) => {
    const subPlayer = allPlayers.find(p => p.id === subPlayerID);
    const playerComingOff = selectedPlayer;
    if (!subPlayer || !playerComingOff) return;

    // Build both event records here directly instead of calling recordEvent()
    // twice in a row — two calls in the same handler both read the same
    // stale `events` snapshot, so the second setEvents() silently overwrote
    // the first and the "Sub Off" entry was getting lost every time.
    const displayTime = half === 1 ? matchTime : matchTime - (45 * 60);
    const mins = Math.floor(displayTime / 60);
    const secs = displayTime % 60;
    const timeStr = `${mins}'${secs.toString().padStart(2, '0')}`;

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

  const handleMotmVote = (playerId) => {
    setUserMotmVote(playerId);
    setMotmVotes(prev => ({
      ...prev,
      [playerId]: (prev[playerId] || 0) + 1
    }));
  };

  const getMotmLeader = () => {
    if (Object.keys(motmVotes).length === 0) return null;
    return Object.entries(motmVotes).reduce((max, [playerId, votes]) =>
      votes > (motmVotes[max] || 0) ? playerId : max
    );
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

  const handleSaveToSheet = async () => {
    setSaving(true);
    try {
      const matchData = {
        timestamp: new Date().toISOString(),
        gameDetails,
        formation: formation,
        totalTime: matchTime,
        goals: events.filter(e => e.event === 'Goal').length,
        events: events,
        playerStats: stats,
        playerTimes: playerTimes,
        motmVotes: motmVotes,
        startingXI: startingXI.map(id => allPlayers.find(p => p.id === id)),
      };

      const response = await fetch('/api/save-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchData }),
      });

      if (!response.ok) throw new Error('Failed to save');
      
      setSaveSuccess(true);
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
                // Parse formation from API — reuse the same FORMATIONS lookup
                // the coach uses, instead of a regex that was mis-parsing the
                // leading "1" as the defender count and dropping fwd entirely.
                const formStr = data.formation || '1-4-4-2';
                const formConfig = FORMATIONS[formStr] || FORMATIONS['1-4-4-2'];
                const pitchPlayers = [];
                let playerIndex = 0;
                
                // GK (bottom, defending y: 120)
                const gkPlayer = data.selectedXI[playerIndex];
                if (gkPlayer) {
                  pitchPlayers.push({
                    ...gkPlayer,
                    position: 'GK',
                    x: 40,
                    y: 120,
                  });
                  playerIndex++;
                }
                
                // DEF (back row, y: 100)
                const defY = 100;
                for (let i = 0; i < formConfig.def; i++) {
                  const player = data.selectedXI[playerIndex];
                  if (player) {
                    const defSpacing = formConfig.def > 1 ? 50 / (formConfig.def - 1) : 0;
                    pitchPlayers.push({
                      ...player,
                      position: 'DEF',
                      x: 15 + i * defSpacing,
                      y: defY,
                    });
                    playerIndex++;
                  }
                }
                
                // MID (midfield row, y: 65)
                const midY = 65;
                for (let i = 0; i < formConfig.mid; i++) {
                  const player = data.selectedXI[playerIndex];
                  if (player) {
                    const midSpacing = formConfig.mid > 1 ? 50 / (formConfig.mid - 1) : 0;
                    pitchPlayers.push({
                      ...player,
                      position: 'MID',
                      x: 15 + i * midSpacing,
                      y: midY,
                    });
                    playerIndex++;
                  }
                }
                
                // FWD (top, attacking y: 30)
                const fwdY = 30;
                for (let i = 0; i < formConfig.fwd; i++) {
                  const player = data.selectedXI[playerIndex];
                  if (player) {
                    const fwdSpacing = formConfig.fwd > 1 ? 50 / (formConfig.fwd - 1) : 0;
                    pitchPlayers.push({
                      ...player,
                      position: 'FWD',
                      x: 15 + i * fwdSpacing,
                      y: fwdY,
                    });
                    playerIndex++;
                  }
                }
                
                setPlayers(pitchPlayers);
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
  }, [mode, matchCode]);

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
              ✅ Team Confirmed → Start Match
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

  // ========== SELECT STATS PERSON (BEFORE MATCH) ==========
  if (screen === 'select-stats-person' && mode === 'coach' && matchStarted && !timerRunning) {
    const selectedSubs = subs.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
    return (
      <div className="container">
        <div className="stats-person-screen">
          <h1>👤 Designate Stats Person</h1>
          <p className="stats-subtitle">Who will track the match today?</p>
          
          <div className="stats-options">
            <div className="option-group">
              <h2>📱 Live Match Tracker</h2>
              <p>Person who records goals, assists, cards, subs</p>
              <select 
                className="stats-select"
                onChange={(e) => {
                  if (e.target.value) {
                    setStatsPerson(parseInt(e.target.value));
                  }
                }}
              >
                <option value="">Select a person...</option>
                <option value="0">Coach (Me)</option>
                {selectedSubs.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.firstName} {player.surname} (Parent)
                  </option>
                ))}
              </select>
            </div>

            <div className="option-group info-box">
              <p><strong>👤 Coach:</strong> Always has access</p>
              <p><strong>📊 Stats Person:</strong> One designated parent/assistant to track events</p>
              <p><strong>👥 Other Parents:</strong> View team sheet before match, MOTM voting after</p>
            </div>
          </div>

          <button 
            className="btn-primary"
            onClick={() => {
              setMatchStarted(true);
              setScreen('match');
              setTimerRunning(true);
              setPlayers(buildPitchPlayers());
            }}
            disabled={!statsPerson && statsPerson !== 0}
          >
            🏁 Start Match
          </button>
        </div>
      </div>
    );
  }

  // ========== MATCH SCREEN (COACH ONLY) ==========
  if (screen === 'match' && matchStarted && (mode === 'coach' || mode === 'parent')) {
    const displayTime = half === 1 ? matchTime : matchTime - (45 * 60);
    
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
            <div className="time">{formatTime(displayTime)}</div>
            <div className="half">Half {half}</div>
          </div>
          <div className="match-controls-header">
            {mode === 'coach' && !matchEnded ? (
              <>
                <button 
                  className={`btn-timer ${timerRunning ? 'active' : ''}`}
                  onClick={() => setTimerRunning(!timerRunning)}
                >
                  {timerRunning ? '⏸' : '▶'}
                </button>
                {half === 1 && (
                  <button className="btn-timer btn-half" onClick={handleHalfTime}>
                    ⏸
                  </button>
                )}
                {half === 2 && (
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

        {!timerRunning && half === 1 && matchTime > 0 && (
          <div className="half-time-banner">
            <h2>⏸ HALF TIME</h2>
            <button className="btn-restart" onClick={handleRestartSecondHalf}>
              Start 2nd Half ▶
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
          const availableSubs = subs.filter(subID => !currentlyOnPitch.has(subID));
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
    const displayTime = half === 1 ? matchTime : matchTime - (45 * 60);
    const motmLeader = getMotmLeader();
    const motmLeaderPlayer = motmLeader ? allPlayers.find(p => p.id === parseInt(motmLeader)) : null;
    
    // MOTM VOTING (After Full-Time)
    if (matchEnded) {
      return (
        <div className="container">
          <div className="parent-watch-screen motm-voting">
            <h1>👑 Vote for Man of the Match</h1>
            
            {userMotmVote ? (
              <div className="voting-confirmation">
                <h2>✅ Vote Recorded!</h2>
                <p>Thank you for voting</p>
              </div>
            ) : (
              <>
                {motmLeader && motmLeaderPlayer && (
                  <div className="motm-leader-card">
                    <p className="leader-label">Current Leading</p>
                    <div className="leader-info">
                      <div className="leader-num">#{motmLeaderPlayer.squadNum}</div>
                      <div className="leader-name">{motmLeaderPlayer.firstName} {motmLeaderPlayer.surname}</div>
                      <div className="leader-votes">{motmVotes[motmLeader] || 0} votes</div>
                    </div>
                  </div>
                )}

                <p className="voting-subtitle">Select your Player of the Match:</p>
                
                <div className="motm-players-grid">
                  {startingXI.map(id => {
                    const player = allPlayers.find(p => p.id === id);
                    const playerVotes = motmVotes[id] || 0;
                    return (
                      <button
                        key={id}
                        className="motm-player-btn"
                        onClick={() => handleMotmVote(id)}
                      >
                        <div className="motm-btn-num">#{player.squadNum}</div>
                        <div className="motm-btn-name">{player.firstName}</div>
                        <div className="motm-btn-votes">{playerVotes} votes</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="motm-results-section">
              <h3>Vote Results</h3>
              <div className="vote-bars">
                {startingXI
                  .map(id => ({
                    id,
                    player: allPlayers.find(p => p.id === id),
                    votes: motmVotes[id] || 0
                  }))
                  .sort((a, b) => b.votes - a.votes)
                  .slice(0, 5)
                  .map((item, idx) => (
                    <div key={item.id} className="vote-bar-item">
                      <div className="vote-bar-label">
                        <span className="rank">#{idx + 1}</span>
                        <span className="name">#{item.player.squadNum} {item.player.firstName}</span>
                      </div>
                      <div className="vote-bar">
                        <div
                          className="vote-bar-fill"
                          style={{
                            width: `${Math.max(20, (item.votes / Math.max(...Object.values(motmVotes), 1)) * 100)}%`
                          }}
                        >
                          <span className="vote-count">{item.votes}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
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
                <div className="time-display">{formatTime(displayTime)}</div>
                <div className="half-display">Half {half}</div>
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
  if (screen === 'summary' && matchEnded && mode === 'coach') {
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

    return (
      <div className="container">
        <div className="summary-screen">
          <h1>🏁 Match Summary</h1>
          
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
            <button 
              className="btn-primary"
              onClick={handleSaveToSheet}
              disabled={saving}
            >
              {saving ? '💾 Saving...' : '💾 Save to Sheets'}
            </button>
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
