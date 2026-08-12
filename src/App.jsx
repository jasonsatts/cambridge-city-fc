import React, { useState, useEffect } from 'react';
import './App.css';

const COACH_PIN = '1234';
const FORMATIONS = {
  '1-4-4-2': { def: 4, mid: 4, fwd: 2 },
  '1-4-5-1': { def: 4, mid: 5, fwd: 1 },
  '1-4-3-3': { def: 4, mid: 3, fwd: 3 },
  '1-5-4-1': { def: 5, mid: 4, fwd: 1 },
  '1-3-5-2': { def: 3, mid: 5, fwd: 2 },
};

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
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // ⏱️ TIME-ON-PITCH TRACKING
  const [playerTimes, setPlayerTimes] = useState({}); // {playerId: [{onTime, offTime, half}]}
  const [currentlyOnPitch, setCurrentlyOnPitch] = useState(new Set()); // Set of player IDs currently on pitch

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
          minutesPlayed: 0 // ⏱️ NEW
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
      const formConfig = FORMATIONS[formation];
      const pitchPlayers = [];
      const onPitch = new Set();
      const times = {};
      
      let playerIndex = 0;
      
      // GK
      const gkPlayer = allPlayers.find(p => p.id === startingXI[playerIndex]);
      pitchPlayers.push({
        ...gkPlayer,
        position: 'GK',
        x: 40,
        y: 120,
      });
      onPitch.add(gkPlayer.id);
      times[gkPlayer.id] = [{ onTime: 0, offTime: null, half: 1 }];
      playerIndex++;
      
      // DEF
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
        onPitch.add(player.id);
        times[player.id] = [{ onTime: 0, offTime: null, half: 1 }];
        playerIndex++;
      }
      
      // MID
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
        onPitch.add(player.id);
        times[player.id] = [{ onTime: 0, offTime: null, half: 1 }];
        playerIndex++;
      }
      
      // FWD
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
        onPitch.add(player.id);
        times[player.id] = [{ onTime: 0, offTime: null, half: 1 }];
        playerIndex++;
      }
      
      // Initialize all subs (not on pitch yet)
      subs.forEach(subID => {
        times[subID] = [];
      });
      
      setPlayers(pitchPlayers);
      setCurrentlyOnPitch(onPitch);
      setPlayerTimes(times);
      setMatchStarted(true);
      setScreen('match');
      setTimerRunning(true);
    }
  };

  const handlePlayerMouseDown = (e, player) => {
    if (mode !== 'coach') return;
    
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
    
    // ⏱️ Calculate final minutes for all players still on pitch
    const finalStats = { ...stats };
    currentlyOnPitch.forEach(playerId => {
      if (playerTimes[playerId] && playerTimes[playerId].length > 0) {
        const lastSession = playerTimes[playerId][playerTimes[playerId].length - 1];
        if (lastSession.offTime === null) {
          // Player is still on pitch at full time
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
    setEvents([newEvent, ...events]);

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

  // ⏱️ NEW: Handle substitution (player coming OFF)
  const handleSubstitution = (subPlayerID) => {
    const subPlayer = allPlayers.find(p => p.id === subPlayerID);
    const playerComingOff = selectedPlayer;
    
    // Record the "Sub Off" event
    recordEvent('Sub Off');
    
    // ⏱️ Mark the time the player came off
    const times = { ...playerTimes };
    if (times[playerComingOff.id] && times[playerComingOff.id].length > 0) {
      const lastSession = times[playerComingOff.id][times[playerComingOff.id].length - 1];
      if (lastSession.offTime === null) {
        lastSession.offTime = matchTime;
        // Calculate minutes for this session
        const mins = Math.floor((matchTime - lastSession.onTime) / 60);
        
        const updatedStats = { ...stats };
        updatedStats[playerComingOff.id].minutesPlayed = 
          (updatedStats[playerComingOff.id].minutesPlayed || 0) + mins;
        setStats(updatedStats);
      }
    }
    
    // ⏱️ Mark the time the sub came on
    if (!times[subPlayerID]) {
      times[subPlayerID] = [];
    }
    times[subPlayerID].push({ onTime: matchTime, offTime: null, half: half });
    
    // Update current on pitch
    const newOnPitch = new Set(currentlyOnPitch);
    newOnPitch.delete(playerComingOff.id);
    newOnPitch.add(subPlayerID);
    
    setPlayerTimes(times);
    setCurrentlyOnPitch(newOnPitch);
    
    // Update pitch players
    const subPosition = playerComingOff.position;
    const updatedPlayers = players.map(p =>
      p.id === playerComingOff.id ? { ...subPlayer, position: subPosition, x: p.x, y: p.y } : p
    );
    setPlayers(updatedPlayers);
    
    // Record "Sub On" event
    recordEvent('Sub On');
    
    setSelectedPlayer(null);
    setShowActionModal(false);
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
        playerTimes: playerTimes, // ⏱️ Include time tracking
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

  // Calculate current minutes for a player
  const getCurrentMinutes = (playerId) => {
    if (!playerTimes[playerId]) return 0;
    let total = stats[playerId]?.minutesPlayed || 0;
    const sessions = playerTimes[playerId];
    if (sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1];
      if (lastSession.offTime === null) {
        // Still on pitch
        const currentSessionMins = Math.floor((matchTime - lastSession.onTime) / 60);
        total += currentSessionMins;
      }
    }
    return total;
  };

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
              <p>Manage lineups & track stats</p>
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
              <p>Watch live match</p>
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

          <div className="match-code-display">
            <p className="code-label">Match Code:</p>
            <p className="code-value">{matchCode}</p>
            <p className="code-hint">Share this with parents</p>
          </div>

          <div className="form-section">
            <button 
              className="btn-primary"
              onClick={() => setShowAnnouncement(true)}
            >
              📢 Preview Announcement
            </button>
            <button 
              className="btn-secondary"
              onClick={() => setScreen('lineup')}
            >
              Continue → Select Team
            </button>
          </div>

          {showAnnouncement && (
            <div className="modal-overlay" onClick={() => setShowAnnouncement(false)}>
              <div className="announcement-modal" onClick={e => e.stopPropagation()}>
                <h2>Match Announcement</h2>
                <div className="announcement-content">
                  <p><strong>Team:</strong> Cambridge City FC U15s Girls</p>
                  <p><strong>Opponent:</strong> {gameDetails.opponent || '[To be confirmed]'}</p>
                  <p><strong>Date:</strong> {gameDetails.date || '[To be confirmed]'}</p>
                  <p><strong>Kick-off:</strong> {gameDetails.kickOffTime || '[To be confirmed]'}</p>
                  <p><strong>Location:</strong> {gameDetails.location || '[To be confirmed]'}</p>
                  <p className="announcement-footer">See you there! ⚽</p>
                </div>
                <button className="btn-close" onClick={() => setShowAnnouncement(false)}>Close</button>
              </div>
            </div>
          )}
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
            Continue → Select Formation ({startingXI.length}/11, {subs.length} subs)
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
            Start Match ⚽
          </button>
        </div>
      </div>
    );
  }

  // ========== MATCH SCREEN ==========
  if (screen === 'match' && matchStarted && mode === 'coach') {
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
        {/* Match Header */}
        <div className="match-header">
          <div className="timer-display">
            <div className="time">{formatTime(displayTime)}</div>
            <div className="half">Half {half}</div>
          </div>
          <div className="match-controls-header">
            {!matchEnded ? (
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
            ) : (
              <div className="full-time-label">🏁</div>
            )}
          </div>
        </div>

        {/* Half Time Banner */}
        {!timerRunning && half === 1 && matchTime > 0 && (
          <div className="half-time-banner">
            <h2>⏸ HALF TIME</h2>
            <button className="btn-restart" onClick={handleRestartSecondHalf}>
              Start 2nd Half ▶
            </button>
          </div>
        )}

        {/* Pitch */}
        <div className="pitch-wrapper">
          <svg viewBox="0 0 80 130" className="pitch" style={{ cursor: draggedPlayer ? 'grabbing' : 'grab' }}>
            <rect width="80" height="130" fill="#2d5016" />
            <line x1="0" y1="0" x2="80" y2="0" stroke="white" strokeWidth="0.5" />
            <line x1="0" y1="130" x2="80" y2="130" stroke="white" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="0" y2="130" stroke="white" strokeWidth="0.5" />
            <line x1="80" y1="0" x2="80" y2="130" stroke="white" strokeWidth="0.5" />
            <line x1="0" y1="65" x2="80" y2="65" stroke="white" strokeWidth="0.4" />
            <circle cx="40" cy="65" r="10" stroke="white" strokeWidth="0.3" fill="none" />
            <circle cx="40" cy="65" r="0.8" fill="white" />
            <rect x="15" y="0" width="50" height="18" stroke="white" strokeWidth="0.3" fill="none" />
            <rect x="15" y="112" width="50" height="18" stroke="white" strokeWidth="0.3" fill="none" />
            <rect x="25" y="0" width="30" height="8" stroke="white" strokeWidth="0.25" fill="none" />
            <rect x="25" y="122" width="30" height="8" stroke="white" strokeWidth="0.25" fill="none" />
            <circle cx="40" cy="3" r="0.5" fill="white" />
            <circle cx="40" cy="127" r="0.5" fill="white" />

            {players.map((player) => (
              <g 
                key={player.id}
                onMouseDown={(e) => handlePlayerMouseDown(e, player)}
                onTouchStart={(e) => handlePlayerMouseDown(e, player)}
                style={{ cursor: 'grab' }}
              >
                <circle cx={player.x} cy={player.y} r="5" fill="#FF6B6B" stroke="white" strokeWidth="0.8" />
                <text x={player.x} y={player.y - 2} textAnchor="middle" fill="white" fontSize="2.5" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                  {player.squadNum}
                </text>
                <text x={player.x} y={player.y + 2.5} textAnchor="middle" fill="white" fontSize="1.6" style={{ pointerEvents: 'none' }}>
                  {player.firstName}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Controls */}
        <div className="match-controls">
          <button className="btn-control" onClick={() => setShowEventsLog(!showEventsLog)}>
            📋 Events ({events.length})
          </button>
        </div>

        {/* Events Log */}
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

        {/* Action Modal */}
        {showActionModal && selectedPlayer && (
          <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>#{selectedPlayer.squadNum} {selectedPlayer.firstName}</h2>
              <p className="squad-name">{selectedPlayer.surname}</p>
              <p className="player-time">⏱️ {getCurrentMinutes(selectedPlayer.id)} mins</p>

              <div className="action-buttons">
                <button onClick={() => recordEvent('Goal')} className="btn-action btn-goal">⚽</button>
                <button onClick={() => recordEvent('Assist')} className="btn-action btn-assist">🎯</button>
                <button onClick={() => recordEvent('Yellow')} className="btn-action btn-yellow">🟨</button>
                <button onClick={() => recordEvent('Red')} className="btn-action btn-red">🟥</button>
                <button onClick={() => recordEvent('MOTM')} className="btn-action btn-motm">👑</button>
              </div>

              <div className="sub-section">
                <label>Substitute:</label>
                <select onChange={(e) => {
                  if (e.target.value) handleSubstitution(parseInt(e.target.value));
                  e.target.value = '';
                }} className="sub-dropdown">
                  <option value="">Select...</option>
                  {subs.map(subID => {
                    const subPlayer = allPlayers.find(p => p.id === subID);
                    // Only show subs not currently on pitch
                    if (!currentlyOnPitch.has(subID)) {
                      return (
                        <option key={subID} value={subID}>
                          {subPlayer?.firstName} {subPlayer?.surname} ({getCurrentMinutes(subID)} mins)
                        </option>
                      );
                    }
                    return null;
                  })}
                </select>
              </div>

              <button onClick={() => setShowActionModal(false)} className="btn-close">Close</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== PARENT WATCH (READ-ONLY) ==========
  if (screen === 'parent-watch' && mode === 'parent') {
    const displayTime = half === 1 ? matchTime : matchTime - (45 * 60);
    
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

              {/* ⏱️ Current XI with minutes */}
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

    // Get all players with their minutes
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

          {/* ⏱️ Minutes Played Table */}
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
              {saving ? '💾 Saving...' : '💾 Save'}
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

  return null;
}
