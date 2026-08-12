import React, { useState, useEffect } from 'react';
import './App.css';

const FORMATIONS = {
  '1-4-4-2': { def: 4, mid: 4, fwd: 2 },
  '1-4-5-1': { def: 4, mid: 5, fwd: 1 },
  '1-4-3-3': { def: 4, mid: 3, fwd: 3 },
  '1-5-4-1': { def: 5, mid: 4, fwd: 1 },
  '1-3-5-2': { def: 3, mid: 5, fwd: 2 },
};

export default function App() {
  const [screen, setScreen] = useState('setup');
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Match timer interval
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
        initialStats[p.id] = { goals: 0, assists: 0, yellow: 0, red: 0, motm: 0 };
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

  const handleSelectStartingXI = () => {
    if (startingXI.length === 11 && subs.length > 0) {
      setScreen('formation');
    }
  };

  const handleFormationSelect = () => {
    if (formation) {
      const formConfig = FORMATIONS[formation];
      const pitchPlayers = [];
      
      let playerIndex = 0;
      
      // GK (1 player, centered)
      const gkPlayer = allPlayers.find(p => p.id === startingXI[playerIndex]);
      pitchPlayers.push({
        ...gkPlayer,
        position: 'GK',
        x: 40,
        y: 120,
      });
      playerIndex++;
      
      // DEF (spread to edges)
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
      
      // MID (spread to edges)
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
      
      // FWD (spread to edges)
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
      
      setPlayers(pitchPlayers);
      setMatchStarted(true);
      setScreen('match');
      setTimerRunning(true);
    }
  };

  const handlePlayerMouseDown = (e, player) => {
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    setTapStartPos({ x: clientX, y: clientY });
    setDraggedPlayer({ ...player, startX: clientX, startY: clientY });
  };

  const handleMouseMove = (e) => {
    if (!draggedPlayer) return;
    
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
      updatedStats[selectedPlayer.id] = { goals: 0, assists: 0, yellow: 0, red: 0, motm: 0 };
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
    recordEvent('Sub Off');
    
    const subPosition = selectedPlayer.position;
    const updatedPlayers = players.map(p =>
      p.id === selectedPlayer.id ? { ...subPlayer, position: subPosition, x: p.x, y: p.y } : p
    );
    setPlayers(updatedPlayers);
    setSelectedPlayer(null);
    setShowActionModal(false);
  };

  const handleSaveToSheet = async () => {
    setSaving(true);
    try {
      const matchData = {
        timestamp: new Date().toISOString(),
        formation: formation,
        totalTime: matchTime,
        goals: events.filter(e => e.event === 'Goal').length,
        events: events,
        playerStats: stats,
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

  // ========== SCREENS ==========

  if (loading) {
    return (
      <div className="container">
        <div className="loading-screen">
          <h1>⚽ Loading squad data...</h1>
          <p>Fetching players from your Google Sheet</p>
        </div>
      </div>
    );
  }

  if (screen === 'setup') {
    const availablePlayers = allPlayers.filter(
      p => !startingXI.includes(p.id) && !subs.includes(p.id)
    );
    const selectedStartingXI = startingXI.map(id => allPlayers.find(p => p.id === id));
    const selectedSubs = subs.map(id => allPlayers.find(p => p.id === id));

    return (
      <div className="container">
        <div className="setup-screen">
          <h1>⚽ Select Starting XI & Substitutes</h1>

          {error && <div className="error-banner">{error}</div>}

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
              <div className="count-badge">{startingXI.length}/11 selected</div>
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
              <div className="count-badge">{subs.length} substitutes ready</div>
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

  if (screen === 'formation') {
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

  if (screen === 'match' && matchStarted) {
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
        {/* Match Header with Timer */}
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
                  {timerRunning ? '⏸ Pause' : '▶ Play'}
                </button>
                {half === 1 && (
                  <button className="btn-timer btn-half" onClick={handleHalfTime}>
                    ⏸ Half Time
                  </button>
                )}
                {half === 2 && (
                  <button className="btn-timer btn-full" onClick={handleFullTime}>
                    🏁 Full Time
                  </button>
                )}
              </>
            ) : (
              <div className="full-time-label">🏁 FULL TIME</div>
            )}
          </div>
        </div>

        {/* Half Time Screen */}
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
            {/* Pitch background */}
            <rect width="80" height="130" fill="#2d5016" />
            
            {/* Top goal line */}
            <line x1="0" y1="0" x2="80" y2="0" stroke="white" strokeWidth="0.5" />
            {/* Bottom goal line */}
            <line x1="0" y1="130" x2="80" y2="130" stroke="white" strokeWidth="0.5" />
            {/* Left sideline */}
            <line x1="0" y1="0" x2="0" y2="130" stroke="white" strokeWidth="0.5" />
            {/* Right sideline */}
            <line x1="80" y1="0" x2="80" y2="130" stroke="white" strokeWidth="0.5" />
            
            {/* Halfway line */}
            <line x1="0" y1="65" x2="80" y2="65" stroke="white" strokeWidth="0.4" />
            {/* Centre circle */}
            <circle cx="40" cy="65" r="10" stroke="white" strokeWidth="0.3" fill="none" />
            {/* Centre spot */}
            <circle cx="40" cy="65" r="0.8" fill="white" />
            
            {/* Top penalty box */}
            <rect x="15" y="0" width="50" height="18" stroke="white" strokeWidth="0.3" fill="none" />
            {/* Bottom penalty box */}
            <rect x="15" y="112" width="50" height="18" stroke="white" strokeWidth="0.3" fill="none" />
            
            {/* Top goal area */}
            <rect x="25" y="0" width="30" height="8" stroke="white" strokeWidth="0.25" fill="none" />
            {/* Bottom goal area */}
            <rect x="25" y="122" width="30" height="8" stroke="white" strokeWidth="0.25" fill="none" />
            
            {/* Top centre mark */}
            <circle cx="40" cy="3" r="0.5" fill="white" />
            {/* Bottom centre mark */}
            <circle cx="40" cy="127" r="0.5" fill="white" />

            {/* Player markers */}
            {players.map((player) => (
              <g 
                key={player.id}
                onMouseDown={(e) => handlePlayerMouseDown(e, player)}
                onTouchStart={(e) => handlePlayerMouseDown(e, player)}
                style={{ cursor: 'grab' }}
              >
                <circle
                  cx={player.x}
                  cy={player.y}
                  r="5"
                  fill="#FF6B6B"
                  stroke="white"
                  strokeWidth="0.8"
                  style={{ cursor: 'grab', userSelect: 'none' }}
                />
                <text
                  x={player.x}
                  y={player.y - 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="2.5"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {player.squadNum}
                </text>
                <text
                  x={player.x}
                  y={player.y + 2.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="1.6"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {player.firstName}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Bottom Control Bar */}
        <div className="match-controls">
          <button 
            className="btn-control"
            onClick={() => setShowEventsLog(!showEventsLog)}
          >
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
              {events.length === 0 ? (
                <p className="no-events">No events yet</p>
              ) : (
                events.map((event, idx) => (
                  <div key={idx} className="event-item">
                    <span className="time">{event.timestamp}</span>
                    <span className="event">{event.event}</span>
                    <span className="player">#{event.squadNum} {event.player}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Action Modal */}
        {showActionModal && selectedPlayer && (
          <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>#{selectedPlayer.squadNum} {selectedPlayer.firstName}</h2>
              <p className="squad-name">{selectedPlayer.surname}</p>

              <div className="action-buttons">
                <button onClick={() => recordEvent('Goal')} className="btn-action btn-goal">⚽ Goal</button>
                <button onClick={() => recordEvent('Assist')} className="btn-action btn-assist">🎯 Assist</button>
                <button onClick={() => recordEvent('Yellow')} className="btn-action btn-yellow">🟨 Yellow</button>
                <button onClick={() => recordEvent('Red')} className="btn-action btn-red">🟥 Red</button>
                <button onClick={() => recordEvent('MOTM')} className="btn-action btn-motm">👑 MOTM</button>
              </div>

              <div className="sub-section">
                <label>Substitute:</label>
                <select onChange={(e) => {
                  if (e.target.value) handleSubstitution(parseInt(e.target.value));
                  e.target.value = '';
                }} className="sub-dropdown">
                  <option value="">Select a substitute...</option>
                  {subs.map(subID => {
                    const subPlayer = allPlayers.find(p => p.id === subID);
                    return (
                      <option key={subID} value={subID}>
                        {subPlayer?.firstName} {subPlayer?.surname} (#{subPlayer?.squadNum})
                      </option>
                    );
                  })}
                </select>
              </div>

              <button onClick={() => setShowActionModal(false)} className="btn-close">✕ Close</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'summary' && matchEnded) {
    const goals = events.filter(e => e.event === 'Goal').length;
    const assists = events.filter(e => e.event === 'Assist').length;
    const cards = events.filter(e => e.event === 'Yellow' || e.event === 'Red').length;

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
            <h2>Match Timeline</h2>
            <div className="events-list">
              {events.map((event, idx) => (
                <div key={idx} className="event-item">
                  <span className="time">{event.timestamp} (H{event.half})</span>
                  <span className="event">{event.event}</span>
                  <span className="player">#{event.squadNum} {event.player}</span>
                </div>
              ))}
            </div>
          </div>

          {saveSuccess && (
            <div className="success-banner">✅ Saved to spreadsheet!</div>
          )}

          <div className="summary-buttons">
            <button 
              className="btn-primary btn-save"
              onClick={handleSaveToSheet}
              disabled={saving}
            >
              {saving ? '💾 Saving...' : '💾 Save to Spreadsheet'}
            </button>
            <button 
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              🔄 Start New Match
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
