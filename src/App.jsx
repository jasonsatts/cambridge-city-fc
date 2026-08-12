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

  // Lineup selection
  const [startingXI, setStartingXI] = useState([]);
  const [subs, setSubs] = useState([]);

  // Match state
  const [formation, setFormation] = useState('1-4-4-2');
  const [matchStarted, setMatchStarted] = useState(false);
  const [players, setPlayers] = useState([]); // Players on pitch with positions
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showEventsLog, setShowEventsLog] = useState(false);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [draggedPlayer, setDraggedPlayer] = useState(null);

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
      // Initialize players with evenly distributed positions
      const formConfig = FORMATIONS[formation];
      const pitchPlayers = [];
      
      let playerIndex = 0;
      
      // GK (1)
      const gkPlayer = allPlayers.find(p => p.id === startingXI[playerIndex]);
      pitchPlayers.push({
        ...gkPlayer,
        position: 'GK',
        x: 50,
        y: 88,
      });
      playerIndex++;
      
      // DEF
      for (let i = 0; i < formConfig.def; i++) {
        const player = allPlayers.find(p => p.id === startingXI[playerIndex]);
        pitchPlayers.push({
          ...player,
          position: 'DEF',
          x: 15 + (i * (70 / (formConfig.def - 1 || 1))),
          y: 70,
        });
        playerIndex++;
      }
      
      // MID
      for (let i = 0; i < formConfig.mid; i++) {
        const player = allPlayers.find(p => p.id === startingXI[playerIndex]);
        pitchPlayers.push({
          ...player,
          position: 'MID',
          x: 15 + (i * (70 / (formConfig.mid - 1 || 1))),
          y: 50,
        });
        playerIndex++;
      }
      
      // FWD
      for (let i = 0; i < formConfig.fwd; i++) {
        const player = allPlayers.find(p => p.id === startingXI[playerIndex]);
        pitchPlayers.push({
          ...player,
          position: 'FWD',
          x: 15 + (i * (70 / (formConfig.fwd - 1 || 1))),
          y: 30,
        });
        playerIndex++;
      }
      
      setPlayers(pitchPlayers);
      setMatchStarted(true);
      setScreen('match');
    }
  };

  const handlePlayerTap = (player) => {
    setSelectedPlayer(player);
    setShowActionModal(true);
  };

  const handleMouseDown = (e, player) => {
    setDraggedPlayer({ ...player, startX: e.clientX || e.touches?.[0]?.clientX });
  };

  const handleMouseMove = (e) => {
    if (!draggedPlayer) return;
    
    const svg = document.querySelector('.pitch');
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX || e.touches?.[0]?.clientX) - rect.left) / rect.width * 100;
    const y = ((e.clientY || e.touches?.[0]?.clientY) - rect.top) / rect.height * 100;
    
    setPlayers(players.map(p =>
      p.id === draggedPlayer.id ? { ...p, x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) } : p
    ));
  };

  const handleMouseUp = () => {
    setDraggedPlayer(null);
  };

  const recordEvent = (eventType) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const newEvent = {
      timestamp: time,
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
    return (
      <div 
        className="match-container"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Pitch */}
        <div className="pitch-wrapper">
          <svg viewBox="0 0 100 100" className="pitch" style={{ cursor: draggedPlayer ? 'grabbing' : 'grab' }}>
            {/* Pitch background */}
            <rect width="100" height="100" fill="#2d5016" />
            {/* Halfway line */}
            <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.3" />
            {/* Centre circle */}
            <circle cx="50" cy="50" r="8" stroke="white" strokeWidth="0.2" fill="none" />
            {/* Centre spot */}
            <circle cx="50" cy="50" r="0.5" fill="white" />
            {/* Penalty boxes */}
            <rect x="5" y="35" width="15" height="30" stroke="white" strokeWidth="0.2" fill="none" />
            <rect x="80" y="35" width="15" height="30" stroke="white" strokeWidth="0.2" fill="none" />
            {/* Goal areas */}
            <rect x="0" y="40" width="5" height="20" stroke="white" strokeWidth="0.15" fill="none" />
            <rect x="95" y="40" width="5" height="20" stroke="white" strokeWidth="0.15" fill="none" />

            {/* Player markers - DRAGGABLE */}
            {players.map((player) => (
              <g 
                key={player.id}
                onMouseDown={(e) => handleMouseDown(e, player)}
                onTouchStart={(e) => handleMouseDown(e, player)}
                style={{ cursor: 'grab' }}
              >
                <circle
                  cx={player.x}
                  cy={player.y}
                  r="4.5"
                  fill="#FF6B6B"
                  stroke="white"
                  strokeWidth="0.5"
                  style={{ cursor: 'grab' }}
                />
                <text
                  x={player.x}
                  y={player.y - 1.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="2.2"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {player.squadNum}
                </text>
                <text
                  x={player.x}
                  y={player.y + 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="1.4"
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

        {/* Events Log - Bottom Sheet */}
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

  return null;
}
