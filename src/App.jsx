import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CONFIG ────────────────────────────────────────
const SUPABASE_URL = "https://fmzhanxealuyvkyfamdr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtemhhbnhlYWx1eXZreWZhbWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMwNDAxNDcsImV4cCI6MjAzODYxNjE0N30.ZKBkY3l71MxK8zJk0QA3B5TLQi_0oQH2K-QrD3KyDWo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── THEME ──────────────────────────────────────────────────
const BLACK   = "#0a0a0a";
const CARD    = "#1a1a1a";
const WHITE   = "#ffffff";
const GRAY    = "#888888";
const GREEN   = "#27ae60";
const RED     = "#e74c3c";
const YELLOW  = "#f39c12";
const ACCENT  = "#c8c8c8";

// ─── U15s GIRLS PLAYERS ─────────────────────────────────────
const INIT_PLAYERS = [
  { id:1,  number:1,  name:"Ella Hodson",                   pos:"GK"  },
  { id:2,  number:2,  name:"Amelia Wilson",                 pos:"DEF" },
  { id:3,  number:3,  name:"Mia Thompson",                  pos:"DEF" },
  { id:4,  number:4,  name:"Lily Johnson",                  pos:"DEF" },
  { id:5,  number:5,  name:"Sophie Davies",                 pos:"DEF" },
  { id:6,  number:6,  name:"Charlotte Rose",                pos:"MID" },
  { id:7,  number:7,  name:"Evie Brown",                    pos:"MID" },
  { id:8,  number:8,  name:"Chloe Martin",                  pos:"MID" },
  { id:9,  number:9,  name:"Grace Ellis",                   pos:"FWD" },
  { id:10, number:10, name:"Poppy Newman",                  pos:"FWD" },
  { id:11, number:11, name:"Freya Peterson",                pos:"FWD" },
  { id:12, number:12, name:"Isabelle Collins",              pos:"MID" },
  { id:13, number:13, name:"Matilda Martinon-Rodriguez",    pos:"DEF"},
  { id:14, number:14, name:"Lucy Bennett",                  pos:"FWD" },
  { id:15, number:15, name:"Emma Taylor",                   pos:"DEF" },
  { id:16, number:16, name:"Olivia Cooper",                 pos:"MID" },
  { id:17, number:17, name:"Hannah Roberts",                pos:"FWD" },
  { id:18, number:18, name:"Bethan McColl",                 pos:"DEF" },
];

function ParentMatchTracker() {
  const [players, setPlayers] = useState(INIT_PLAYERS);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchPlayers();
    const sub = supabase
      .channel("events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (p) => {
        if (p.new) addEvent(p.new);
      })
      .subscribe();
    return () => sub.unsubscribe();
  }, []);

  async function fetchPlayers() {
    const { data, error } = await supabase.from("players").select("*");
    if (!error && data) setPlayers(data.sort((a, b) => a.number - b.number));
  }

  async function logEvent(playerId, eventType) {
    await supabase.from("events").insert([
      {
        player_id: playerId,
        event_type: eventType,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  function addEvent(event) {
    setEvents((prev) => [event, ...prev.slice(0, 19)]);
  }

  const posColors = {
    GK:  { text:"#ffc800" },
    DEF: { text:"#5dade2" },
    MID: { text:"#27ae60" },
    FWD: { text:"#e74c3c" },
  };

  return (
    <div style={{ background:BLACK, color:WHITE, minHeight:"100vh", paddingBottom:20, fontFamily:"system-ui,-apple-system" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a1a1a,#2a2a2a)", padding:"16px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize:13, fontWeight:700, color:ACCENT, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>⚽ Cambridge City FC</div>
        <div style={{ fontSize:20, fontWeight:800 }}>U15s Girls</div>
        <div style={{ fontSize:12, color:GRAY, marginTop:4 }}>Match Tracker — Saturday</div>
      </div>

      {/* Players Grid */}
      <div style={{ padding:"16px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"10px" }}>
          {players.map((p) => (
            <div
              key={p.id}
              style={{
                background:CARD,
                border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:12,
                padding:"12px",
                textAlign:"center",
              }}
            >
              <div style={{ fontSize:24, fontWeight:900, color:posColors[p.pos]?.text || WHITE, marginBottom:4 }}>
                {String(p.number).padStart(2, "0")}
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:WHITE, marginBottom:8 }}>
                {p.name.split(" ").pop()}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"6px" }}>
                <button onClick={() => logEvent(p.id, "goal")} style={{ background:GREEN, color:BLACK, border:"none", borderRadius:6, padding:"6px", fontSize:10, fontWeight:700, cursor:"pointer" }}>⚽</button>
                <button onClick={() => logEvent(p.id, "assist")} style={{ background:ACCENT, color:BLACK, border:"none", borderRadius:6, padding:"6px", fontSize:10, fontWeight:700, cursor:"pointer" }}>🎯</button>
                <button onClick={() => logEvent(p.id, "sub")} style={{ background:YELLOW, color:BLACK, border:"none", borderRadius:6, padding:"6px", fontSize:10, fontWeight:700, cursor:"pointer" }}>🔄</button>
                <button onClick={() => logEvent(p.id, "yellow")} style={{ background:YELLOW, color:BLACK, border:"none", borderRadius:6, padding:"6px", fontSize:10, fontWeight:700, cursor:"pointer" }}>🟨</button>
                <button onClick={() => logEvent(p.id, "red")} style={{ background:RED, color:WHITE, border:"none", borderRadius:6, padding:"6px", fontSize:10, fontWeight:700, cursor:"pointer" }}>🟥</button>
                <button onClick={() => logEvent(p.id, "motm")} style={{ background:"rgba(255,193,7,0.2)", color:"#ffc107", border:"1px solid #ffc107", borderRadius:6, padding:"6px", fontSize:10, fontWeight:700, cursor:"pointer" }}>👑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Events */}
      {events.length > 0 && (
        <div style={{ padding:"16px", marginTop:"20px", borderTop:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize:12, fontWeight:700, color:ACCENT, letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>Live Events</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {events.map((e, i) => (
              <div
                key={i}
                style={{
                  background:CARD,
                  border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:8,
                  padding:"10px",
                  fontSize:12,
                }}
              >
                {e.event_type === "goal" && "⚽ Goal!"}
                {e.event_type === "assist" && "🎯 Assist!"}
                {e.event_type === "sub" && "🔄 Substitution"}
                {e.event_type === "yellow" && "🟨 Yellow Card"}
                {e.event_type === "red" && "🟥 Red Card"}
                {e.event_type === "motm" && "👑 Man of the Match"}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding:"16px", marginTop:"40px", textAlign:"center", color:GRAY, fontSize:11 }}>
        Data syncs live to Google Sheets
      </div>
    </div>
  );
}

export default ParentMatchTracker;