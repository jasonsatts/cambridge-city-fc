import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fmzhanxealuyvkyfamdr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtemhhbnhlYWx1eXZreWZhbWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMwNDAxNDcsImV4cCI6MjAzODYxNjE0N30.ZKBkY3l71MxK8zJk0QA3B5TLQi_0oQH2K-QrD3KyDWo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── COLORS ───────────────────────────────────────────────
const BLACK = "#0a0a0a";
const DARK = "#111111";
const CARD = "#1a1a1a";
const WHITE = "#ffffff";
const GRAY = "#888888";
const GREEN = "#27ae60";
const RED = "#e74c3c";
const YELLOW = "#f39c12";
const ACCENT = "#c8c8c8";
const PITCH_GREEN = "#2d5a2d";

// ─── FORMATIONS ───────────────────────────────────────────
const FORMATIONS = {
  "1-4-4-2": { gk: 1, def: 4, mid: 4, fwd: 2 },
  "1-4-5-1": { gk: 1, def: 4, mid: 5, fwd: 1 },
  "1-4-3-3": { gk: 1, def: 4, mid: 3, fwd: 3 },
  "1-5-4-1": { gk: 1, def: 5, mid: 4, fwd: 1 },
  "1-3-5-2": { gk: 1, def: 3, mid: 5, fwd: 2 },
};

// ─── U15s GIRLS PLAYERS ───────────────────────────────────
const ALL_PLAYERS = [
  { id: 1, first: "Ella", last: "Hodson", pos: "GK" },
  { id: 2, first: "Amelia", last: "Wilson", pos: "DEF" },
  { id: 3, first: "Mia", last: "Thompson", pos: "DEF" },
  { id: 4, first: "Lily", last: "Johnson", pos: "DEF" },
  { id: 5, first: "Sophie", last: "Davies", pos: "DEF" },
  { id: 6, first: "Charlotte", last: "Rose", pos: "MID" },
  { id: 7, first: "Evie", last: "Brown", pos: "MID" },
  { id: 8, first: "Chloe", last: "Martin", pos: "MID" },
  { id: 9, first: "Grace", last: "Ellis", pos: "FWD" },
  { id: 10, first: "Poppy", last: "Newman", pos: "FWD" },
  { id: 11, first: "Freya", last: "Peterson", pos: "FWD" },
  { id: 12, first: "Isabelle", last: "Collins", pos: "MID" },
  { id: 13, first: "Matilda", last: "Martinon-Rodriguez", pos: "DEF" },
  { id: 14, first: "Lucy", last: "Bennett", pos: "FWD" },
  { id: 15, first: "Emma", last: "Taylor", pos: "DEF" },
  { id: 16, first: "Olivia", last: "Cooper", pos: "MID" },
  { id: 17, first: "Hannah", last: "Roberts", pos: "FWD" },
  { id: 18, first: "Bethan", last: "McColl", pos: "DEF" },
];

// ─── PITCH POSITIONS FOR FORMATIONS ───────────────────────
const getPitchPositions = (formation) => {
  const config = FORMATIONS[formation];
  const positions = {};
  
  // GK position (center, back)
  positions.gk = [{ x: 50, y: 92 }];
  
  // Defenders (spread across back line)
  positions.def = [];
  const defSpacing = 100 / (config.def + 1);
  for (let i = 0; i < config.def; i++) {
    positions.def.push({ x: defSpacing * (i + 1), y: 75 });
  }
  
  // Midfielders (middle of pitch)
  positions.mid = [];
  const midSpacing = 100 / (config.mid + 1);
  for (let i = 0; i < config.mid; i++) {
    positions.mid.push({ x: midSpacing * (i + 1), y: 50 });
  }
  
  // Forwards (attack line)
  positions.fwd = [];
  const fwdSpacing = 100 / (config.fwd + 1);
  for (let i = 0; i < config.fwd; i++) {
    positions.fwd.push({ x: fwdSpacing * (i + 1), y: 25 });
  }
  
  return positions;
};

// ─── ACTION BUTTON STYLE ───────────────────────────────────
const actionButtonStyle = () => ({
  padding: "12px",
  border: "none",
  borderRadius: "6px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "13px",
  color: WHITE,
  flex: 1
});

// ─── MAIN APP ───────────────────────────────────────────────
function MatchTracker() {
  const [formation, setFormation] = useState("1-4-4-2");
  const [gameState, setGameState] = useState("setup"); // setup, playing
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionMenu, setActionMenu] = useState(false);
  const [onPitch, setOnPitch] = useState([]);
  const [bench, setBench] = useState([]);
  const [stats, setStats] = useState({});
  const [events, setEvents] = useState([]);
  const [subMenuOpen, setSubMenuOpen] = useState(false);

  // Initialize stats for all players
  useEffect(() => {
    const initialStats = {};
    ALL_PLAYERS.forEach(p => {
      initialStats[p.id] = { 
        goals: 0, 
        assists: 0, 
        yellow: 0, 
        red: 0, 
        motm: false, 
        timeOn: 0 
      };
    });
    setStats(initialStats);
  }, []);

  // Handle formation change
  const handleFormationChange = (newFormation) => {
    setFormation(newFormation);
  };

  // Start match - set players on pitch
  const startMatch = () => {
    const config = FORMATIONS[formation];
    const totalOnPitch = config.gk + config.def + config.mid + config.fwd;
    
    // Separate by position
    const gkPlayers = ALL_PLAYERS.filter(p => p.pos === "GK").slice(0, config.gk);
    const defPlayers = ALL_PLAYERS.filter(p => p.pos === "DEF").slice(0, config.def);
    const midPlayers = ALL_PLAYERS.filter(p => p.pos === "MID").slice(0, config.mid);
    const fwdPlayers = ALL_PLAYERS.filter(p => p.pos === "FWD").slice(0, config.fwd);
    
    const starting = [...gkPlayers, ...defPlayers, ...midPlayers, ...fwdPlayers];
    const benched = ALL_PLAYERS.filter(p => !starting.includes(p));
    
    setOnPitch(starting);
    setBench(benched);
    setGameState("playing");
  };

  // Handle player tap
  const handlePlayerTap = (player) => {
    setSelectedPlayer(player);
    setActionMenu(true);
    setSubMenuOpen(false);
  };

  // Log action
  const logAction = (action, subPlayer = null) => {
    if (action === "sub" && subPlayer) {
      // Swap players
      setOnPitch(onPitch.map(p => p.id === selectedPlayer.id ? subPlayer : p));
      setBench(bench.map(p => p.id === subPlayer.id ? selectedPlayer : p));
      setEvents(prev => [...prev, { 
        player: selectedPlayer.first + " " + selectedPlayer.last, 
        action: "Subbed off", 
        time: new Date().toLocaleTimeString() 
      }]);
      setEvents(prev => [...prev, { 
        player: subPlayer.first + " " + subPlayer.last, 
        action: "Subbed on", 
        time: new Date().toLocaleTimeString() 
      }]);
    } else {
      // Update stats
      const newStats = { ...stats };
      if (action === "goal") newStats[selectedPlayer.id].goals += 1;
      if (action === "assist") newStats[selectedPlayer.id].assists += 1;
      if (action === "yellow") newStats[selectedPlayer.id].yellow += 1;
      if (action === "red") newStats[selectedPlayer.id].red += 1;
      if (action === "motm") newStats[selectedPlayer.id].motm = true;
      setStats(newStats);
      
      setEvents(prev => [...prev, { 
        player: selectedPlayer.first + " " + selectedPlayer.last, 
        action: action.charAt(0).toUpperCase() + action.slice(1), 
        time: new Date().toLocaleTimeString() 
      }]);
    }
    
    setActionMenu(false);
    setSelectedPlayer(null);
    setSubMenuOpen(false);
  };

  const pitchPositions = getPitchPositions(formation);

  return (
    <div style={{ background: BLACK, color: WHITE, minHeight: "100vh", paddingBottom: 20, fontFamily: "system-ui,-apple-system" }}>
      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg,${DARK},${CARD})`, padding: "16px", borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>⚽ Cambridge City FC</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>U15s Girls Match Tracker</div>
      </div>

      {/* SETUP SCREEN */}
      {gameState === "setup" && (
        <div style={{ padding: "20px" }}>
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", color: GRAY }}>Select Formation</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {Object.keys(FORMATIONS).map(form => (
                <button
                  key={form}
                  onClick={() => handleFormationChange(form)}
                  style={{
                    padding: "12px",
                    background: formation === form ? GREEN : CARD,
                    color: formation === form ? BLACK : WHITE,
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  {form}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", color: GRAY }}>Starting XI Setup</h3>
            <div style={{ background: CARD, padding: "16px", borderRadius: "8px", fontSize: "12px", lineHeight: "1.8", color: GRAY }}>
              <p style={{ margin: 0 }}>📊 <strong>Coach:</strong> Set your lineup in the Google Sheets</p>
              <p style={{ marginTop: "8px", margin: 0 }}>👥 <strong>Players:</strong> App loads automatically</p>
              <p style={{ marginTop: "8px", margin: 0 }}>Formation: <strong>{formation}</strong></p>
            </div>
          </div>

          <button
            onClick={startMatch}
            style={{
              width: "100%",
              padding: "16px",
              background: GREEN,
              color: BLACK,
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            START MATCH
          </button>
        </div>
      )}

      {/* MATCH SCREEN */}
      {gameState === "playing" && (
        <div style={{ padding: "20px" }}>
          {/* PITCH */}
          <div style={{
            background: PITCH_GREEN,
            border: "3px solid rgba(255,255,255,0.3)",
            borderRadius: "12px",
            position: "relative",
            aspectRatio: "10 / 13",
            marginBottom: "20px",
            overflow: "hidden"
          }}>
            {/* Field lines SVG */}
            <svg style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0 }} viewBox="0 0 100 130">
              <line x1="0" y1="65" x2="100" y2="65" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
              <circle cx="50" cy="65" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
              <circle cx="50" cy="65" r="0.5" fill="rgba(255,255,255,0.3)" />
              <rect x="15" y="5" width="70" height="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
              <rect x="15" y="105" width="70" height="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            </svg>

            {/* PLAYERS ON PITCH */}
            {onPitch.map((player, idx) => {
              const posType = player.pos === "GK" ? "gk" : player.pos === "DEF" ? "def" : player.pos === "MID" ? "mid" : "fwd";
              const posIndex = onPitch.filter(p => p.pos === player.pos).indexOf(player);
              const pos = pitchPositions[posType][posIndex];
              
              return (
                <div
                  key={player.id}
                  onClick={() => handlePlayerTap(player)}
                  style={{
                    position: "absolute",
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                    background: `linear-gradient(135deg,${CARD},${DARK})`,
                    border: selectedPlayer?.id === player.id ? `2px solid ${GREEN}` : "2px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    textAlign: "center",
                    minWidth: "70px",
                    transition: "all 0.2s",
                    boxShadow: selectedPlayer?.id === player.id ? `0 0 10px ${GREEN}` : "none",
                    zIndex: selectedPlayer?.id === player.id ? 10 : 1
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: ACCENT }}>{player.first}</div>
                  <div style={{ fontSize: "10px", color: WHITE }}>{player.last}</div>
                  {stats[player.id] && stats[player.id].goals > 0 && (
                    <div style={{ fontSize: "9px", color: GREEN, marginTop: "4px" }}>⚽ {stats[player.id].goals}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ACTION MENU */}
          {actionMenu && selectedPlayer && (
            <div style={{
              background: DARK,
              border: `1px solid ${GREEN}`,
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px"
            }}>
              <div style={{ marginBottom: "16px", fontSize: "14px", fontWeight: 700, color: ACCENT }}>
                {selectedPlayer.first} {selectedPlayer.last}
              </div>
              
              {/* ACTION BUTTONS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <button 
                  onClick={() => logAction("goal")} 
                  style={{ ...actionButtonStyle(), background: GREEN, color: BLACK }}
                >
                  ⚽ Goal
                </button>
                <button 
                  onClick={() => logAction("assist")} 
                  style={{ ...actionButtonStyle(), background: ACCENT, color: BLACK }}
                >
                  🎯 Assist
                </button>
                <button 
                  onClick={() => logAction("yellow")} 
                  style={{ ...actionButtonStyle(), background: YELLOW, color: BLACK }}
                >
                  🟨 Yellow
                </button>
                <button 
                  onClick={() => logAction("red")} 
                  style={{ ...actionButtonStyle(), background: RED }}
                >
                  🟥 Red
                </button>
                <button 
                  onClick={() => logAction("motm")} 
                  style={{ ...actionButtonStyle(), background: ACCENT, color: BLACK }}
                >
                  👑 MOTM
                </button>
                <button 
                  onClick={() => setActionMenu(false)} 
                  style={{ ...actionButtonStyle(), background: GRAY }}
                >
                  ✕ Close
                </button>
              </div>

              {/* SUBSTITUTION SECTION */}
              {bench.length > 0 && (
                <div style={{ 
                  paddingTop: "16px", 
                  borderTop: `1px solid rgba(255,255,255,0.1)` 
                }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", color: GRAY }}>
                    Substitute Player
                  </div>
                  <select
                    onChange={(e) => {
                      const subPlayer = ALL_PLAYERS.find(p => p.id === parseInt(e.target.value));
                      if (subPlayer) logAction("sub", subPlayer);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: CARD,
                      color: WHITE,
                      border: `1px solid ${GREEN}`,
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600
                    }}
                  >
                    <option value="">Select a sub from bench...</option>
                    {bench.map(p => (
                      <option key={p.id} value={p.id}>{p.first} {p.last}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* STATS SECTION */}
          <div style={{ background: CARD, borderRadius: "8px", padding: "16px", marginBottom: "20px", border: `1px solid rgba(255,255,255,0.1)` }}>
            <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "12px", textTransform: "uppercase", color: GRAY }}>Live Stats</div>
            <div style={{ fontSize: "11px", lineHeight: "1.9" }}>
              {onPitch.filter(p => stats[p.id] && (stats[p.id].goals > 0 || stats[p.id].assists > 0 || stats[p.id].yellow > 0 || stats[p.id].red > 0)).length === 0 ? (
                <div style={{ color: GRAY }}>No actions recorded yet...</div>
              ) : (
                onPitch.filter(p => stats[p.id] && (stats[p.id].goals > 0 || stats[p.id].assists > 0 || stats[p.id].yellow > 0 || stats[p.id].red > 0)).map(p => (
                  <div key={p.id} style={{ marginBottom: "8px", padding: "8px", background: DARK, borderRadius: "6px", borderLeft: `3px solid ${GREEN}` }}>
                    <strong>{p.first} {p.last}:</strong> 
                    {stats[p.id].goals > 0 && ` ${stats[p.id].goals}G`}
                    {stats[p.id].assists > 0 && ` ${stats[p.id].assists}A`}
                    {stats[p.id].yellow > 0 && ` 🟨×${stats[p.id].yellow}`}
                    {stats[p.id].red > 0 && ` 🟥×${stats[p.id].red}`}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* EVENTS LOG */}
          {events.length > 0 && (
            <div style={{ background: CARD, borderRadius: "8px", padding: "16px", border: `1px solid rgba(255,255,255,0.1)` }}>
              <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "12px", textTransform: "uppercase", color: GRAY }}>Match Events</div>
              <div style={{ fontSize: "10px", lineHeight: "1.9", maxHeight: "200px", overflowY: "auto" }}>
                {[...events].reverse().map((e, i) => (
                  <div key={i} style={{ marginBottom: "6px", padding: "6px", background: DARK, borderRadius: "4px", color: ACCENT }}>
                    <strong style={{ color: GREEN }}>{e.player}</strong> — {e.action} <span style={{ color: GRAY, fontSize: "9px" }}>({e.time})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MatchTracker;// Deployment refresh Wed Aug 12 13:42:01 BST 2026
