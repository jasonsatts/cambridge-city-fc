import React, { useState, useEffect } from 'react';
import './App.css';

// Google Sheet ID and configuration
const SHEET_ID = '1HNU4KIb_84KTASKqwV32Jeo3Wcr4jJyV2px5hM9eC9s';
const PLAYERS_GID = '1456060265'; // Correct sheet ID for "Players" tab
const PLAYERS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${PLAYERS_GID}`;

// Formation templates
const FORMATIONS = {
  '1-4-4-2': { def: 4, mid: 4, fwd: 2 },
  '1-4-5-1': { def: 4, mid: 5, fwd: 1 },
  '1-4-3-3': { def: 4, mid: 3, fwd: 3 },
  '1-5-4-1': { def: 5, mid: 4, fwd: 1 },
  '1-3-5-2': { def: 3, mid: 5, fwd: 2 },
};

export default function App() {
  const [screen, setScreen] = useState('setup'); // setup -> lineup -> formation -> match
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lineup selection state
  const [startingXI, setStartingXI] = useState([]);
  const [subs, setSubs] = useState([]);

  // Match state
  const [formation, setFormation] = useState('1-4-4-2');
  const [matchStarted, setMatchStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});

  // Fetch players from Google Sheet CSV
  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching from:', PLAYERS_CSV_URL);
      
      // Fetch CSV from public Google Sheet
      const response = await fetch(PLAYERS_CSV_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const csvText = await response.text();
      console.log('CSV response length:', csvText.length);
      
      // Parse CSV
      const rows = csvText.trim().split('\n').filter(row => row.trim());
      console.log('Total rows:', rows.length);
      
      if (rows.length < 2) {
        setError('Sheet is empty or invalid');
        setLoading(false);
        return;
      }

      // Log header row
      console.log('Header row:', rows[0]);

      // Skip header row, parse player data
      const players = rows.slice(1).map((row, idx) => {
        // Parse CSV row (handle commas in names)
        const cols = row.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        
        return {
          id: idx + 1,
          playerId: cols[0] || idx + 1,
          squadNum: cols[1] || idx + 1,
          firstName: cols[2] || '',
          surname: cols[3] || '',
          position: cols[4] || '',
          fullName: `${cols[2] || ''} ${cols[3] || ''}`.trim(),
        };
      }).filter(p => p.firstName || p.surname); // Filter out empty rows

      console.log('Parsed players:', players);
      setAllPlayers(players);

      // Initialize stats
      const initialStats = {};
      players.forEach(p => {
        initialStats[p.id] = { 
          goals: 0, 
          assists: 0, 
          yellow: 0, 
          red: 0, 
          motm: 0, 
          onPitch: false, 
          subOnTime: null 
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

  const handleSelectStartingXI = () => {
    if (startingXI.length === 11 && subs.length > 0) {
      setScreen('formation');
    }
  };

  const handleFormationSelect = () => {
    if (formation) {
      // Set up pitch with selected starting XI
      const pitchPlayers = startingXI.map((playerID) => {
        const player = allPlayers.find(p => p.id === playerID);
        return { ...player, onPitch: true };
      });
      setPlayers(pitchPlayers);
      setMatchStarted(true);
      setScreen('match');
    }
  };

  const handlePlayerTap = (player) => {
    setSelectedPlayer(player);
    setShowActionModal(true);
  };

  const recordEvent = (eventType, note = '') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const newEvent = {
      timestamp: time,
      player: selectedPlayer.fullName,
      squadNum: selectedPlayer.squadNum,
      event: eventType,
      note,
    };
    setEvents([newEvent, ...events]);

    // Update stats
    const updatedStats = { ...stats };
    if (!updatedStats[selectedPlayer.id]) {
      updatedStats[selectedPlayer.id] = { goals: 0, assists: 0, yellow: 0, red: 0, motm: 0, onPitch: false };
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
    
    // Record sub off
    recordEvent('Sub Off', `Replaced by ${subPlayer.fullName}`);
    
    // Update pitch players
    const updatedPlayers = players.map(p =>
      p.id === selectedPlayer.id ? { ...subPlayer, onPitch: true } : p
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

  // SCREEN 1: Select Starting XI & Subs
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
            {/* Starting XI Dropdowns */}
            <div className="selection-section">
              <h2>Starting XI (11 Players)</h2>
              <div className="player-list">
                {selectedStartingXI.map((player, idx) => (
                  <div key={idx} className="selected-player">
                    <span>#{idx + 1}</span>
                    <span>{player?.fullName} ({player?.squadNum})</span>
                    <button onClick={() => setStartingXI(startingXI.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                {startingXI.length < 11 && (
                  <select className="player-dropdown" onChange={(e) => {
                    if (e.target.value) {
                      const playerID = parseInt(e.target.value);
                      setStartingXI([...startingXI, playerID]);
                      e.target.value = '';
                    }
                  }}>
                    <option value="">+ Add Player ({startingXI.length}/11)</option>
                    {availablePlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} (#{p.squadNum})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="count-badge">{startingXI.length}/11 selected</div>
            </div>

            {/* Substitutes Dropdowns */}
            <div className="selection-section">
              <h2>Substitutes (Min. 1)</h2>
              <div className="player-list">
                {selectedSubs.map((player, idx) => (
                  <div key={idx} className="selected-player">
                    <span>Sub {idx + 1}</span>
                    <span>{player?.fullName} ({player?.squadNum})</span>
                    <button onClick={() => setSubs(subs.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                <select className="player-dropdown" onChange={(e) => {
                  if (e.target.value) {
                    const playerID = parseInt(e.target.value);
                    setSubs([...subs, playerID]);
                    e.target.value = '';
                  }
                }}>
                  <option value="">+ Add Substitute ({subs.length} added)</option>
                  {availablePlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} (#{p.squadNum})
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

  // SCREEN 2: Select Formation
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

  // SCREEN 3: Match View
  if (screen === 'match' && matchStarted) {
    const pitchPositions = {
      GK: { y: '92%' },
      DEF: { y: '75%' },
      MID: { y: '50%' },
      FWD: { y: '25%' },
      '': { y: '50%' }, // Default if no position
    };

    return (
      <div className="container match-container">
        <div className="match-view">
          {/* Football Pitch */}
          <div className="pitch-container">
            <svg viewBox="0 0 100 100" className="pitch">
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

              {/* Player markers */}
              {players.map((player, idx) => {
                const playersByPosition = players.filter(p => p.position === player.position || (p.position === '' && player.position === ''));
                const posIdx = playersByPosition.indexOf(player);

                let xPosition;
                if (player.position === 'GK') xPosition = 50;
                else {
                  const xSpacing = 60 / (playersByPosition.length + 1);
                  xPosition = 20 + xSpacing * (posIdx + 1);
                }

                const yStr = pitchPositions[player.position]?.y || '50%';
                const yPosition = parseInt(yStr) / 100 * 100;

                return (
                  <g key={idx} onClick={() => handlePlayerTap(player)}>
                    <circle
                      cx={xPosition}
                      cy={yPosition}
                      r="3"
                      fill="#FF6B6B"
                      stroke="white"
                      strokeWidth="0.3"
                      style={{ cursor: 'pointer' }}
                    />
                    <text
                      x={xPosition}
                      y={yPosition + 0.5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="1.5"
                      fontWeight="bold"
                      style={{ cursor: 'pointer', pointerEvents: 'none' }}
                    >
                      {player.squadNum}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Events Log */}
          <div className="events-log">
            <h3>Match Events</h3>
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
        </div>

        {/* Action Modal */}
        {showActionModal && selectedPlayer && (
          <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>{selectedPlayer.fullName}</h2>
              <p className="squad-num">#{selectedPlayer.squadNum}</p>

              <div className="action-buttons">
                <button onClick={() => recordEvent('Goal')} className="btn-action btn-goal">⚽ Goal</button>
                <button onClick={() => recordEvent('Assist')} className="btn-action btn-assist">🎯 Assist</button>
                <button onClick={() => recordEvent('Yellow')} className="btn-action btn-yellow">🟨 Yellow</button>
                <button onClick={() => recordEvent('Red')} className="btn-action btn-red">🟥 Red</button>
                <button onClick={() => recordEvent('MOTM')} className="btn-action btn-motm">👑 MOTM</button>
              </div>

              {/* Substitution Dropdown */}
              <div className="sub-section">
                <label>Substitute:</label>
                <select onChange={(e) => {
                  if (e.target.value) handleSubstitution(parseInt(e.target.value));
                  e.target.value = '';
                }}>
                  <option value="">Select a substitute...</option>
                  {subs.map(subID => {
                    const subPlayer = allPlayers.find(p => p.id === subID);
                    return (
                      <option key={subID} value={subID}>
                        {subPlayer?.fullName} (#{subPlayer?.squadNum})
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
