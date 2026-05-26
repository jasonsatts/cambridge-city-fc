import { useState } from "react";

// ─── THEME — Cambridge City FC (Lilywhites) ─────────────────
const BLACK   = "#0a0a0a";
const DARK    = "#111111";
const CARD    = "#1a1a1a";
const CARD2   = "#222222";
const WHITE   = "#ffffff";
const OFF_WHITE = "#f0f0f0";
const GRAY    = "#888888";
const LGRAY   = "#555555";
const GREEN   = "#27ae60";
const RED     = "#e74c3c";
const ACCENT  = "#c8c8c8"; // silver/white accent

const POS_COLORS = {
  GK:  { bg:"rgba(255,200,0,0.15)",   text:"#ffc800" },
  DEF: { bg:"rgba(52,152,219,0.15)",  text:"#5dade2" },
  MID: { bg:"rgba(39,174,96,0.15)",   text:"#27ae60" },
  FWD: { bg:"rgba(231,76,60,0.15)",   text:"#e74c3c" },
};

// ─── INITIAL DATA ───────────────────────────────────────────
const INIT_PLAYERS = [
  { id:1,  num:1,  name:"Tom Trewin",      short:"T. Trewin",   pos:"GK",  apps:28, goals:0, assists:0, motm:2, cs:9  },
  { id:2,  num:2,  name:"Josh Dawkin",     short:"J. Dawkin",   pos:"DEF", apps:25, goals:1, assists:2, motm:1 },
  { id:3,  num:3,  name:"Sam Mulready",    short:"S. Mulready", pos:"DEF", apps:26, goals:0, assists:3, motm:0 },
  { id:4,  num:4,  name:"Harry Darling",   short:"H. Darling",  pos:"DEF", apps:27, goals:2, assists:1, motm:1 },
  { id:5,  num:5,  name:"Jake Fenton",     short:"J. Fenton",   pos:"DEF", apps:24, goals:1, assists:0, motm:0 },
  { id:6,  num:6,  name:"Ryan Ingledow",   short:"R. Ingledow", pos:"MID", apps:26, goals:3, assists:4, motm:2 },
  { id:7,  num:7,  name:"Josh Wrightson",  short:"J. Wrightson",pos:"MID", apps:22, goals:4, assists:6, motm:3 },
  { id:8,  num:8,  name:"Tom Smith",       short:"T. Smith",    pos:"MID", apps:28, goals:5, assists:8, motm:4 },
  { id:9,  num:9,  name:"Dan Brown",       short:"D. Brown",    pos:"FWD", apps:25, goals:14,assists:3, motm:5 },
  { id:10, num:10, name:"Joe Neal",        short:"J. Neal",     pos:"FWD", apps:27, goals:11,assists:5, motm:3 },
  { id:11, num:11, name:"Adam Marriott",   short:"A. Marriott", pos:"FWD", apps:20, goals:7, assists:2, motm:2 },
  { id:12, num:12, name:"Liam Pauling",    short:"L. Pauling",  pos:"MID", apps:18, goals:2, assists:3, motm:0 },
  { id:14, num:14, name:"Ben Seymour",     short:"B. Seymour",  pos:"FWD", apps:15, goals:4, assists:1, motm:1 },
  { id:15, num:15, name:"Matt Foy",        short:"M. Foy",      pos:"DEF", apps:12, goals:0, assists:1, motm:0 },
  { id:16, num:16, name:"Callum Jones",    short:"C. Jones",    pos:"MID", apps:10, goals:1, assists:2, motm:0 },
];

const INIT_RESULTS = [
  { id:1, date:"17 May", opponent:"Corby Town",        home:true,  score:"3–1", outcome:"W", scorers:"Brown 22', Neal 44' · Smith 67'",      motm:"Dan Brown"     },
  { id:2, date:"10 May", opponent:"Loughborough Dyn",  home:false, score:"1–1", outcome:"D", scorers:"Marriott 55'",                          motm:"Tom Trewin"    },
  { id:3, date:"3 May",  opponent:"Hednesford Town",   home:true,  score:"2–0", outcome:"W", scorers:"Neal 12' · Brown 78'",                  motm:"Joe Neal"      },
  { id:4, date:"26 Apr", opponent:"Leamington FC",     home:false, score:"0–1", outcome:"L", scorers:"—",                                    motm:"Tom Trewin"    },
  { id:5, date:"19 Apr", opponent:"Rushall Olympic",   home:true,  score:"4–2", outcome:"W", scorers:"Brown 8', 45' · Wrightson 60' · Neal 88'", motm:"Dan Brown" },
];

const INIT_FIXTURES = [
  { id:"f1", date:"Sat 31 May", time:"3:00pm",  opponent:"Biggleswade FC",   home:true,  comp:"NPL Midlands" },
  { id:"f2", date:"Sat 7 Jun",  time:"3:00pm",  opponent:"Peterborough Sp.", home:false, comp:"NPL Midlands" },
  { id:"f3", date:"Sat 14 Jun", time:"3:00pm",  opponent:"Bedworth United",  home:true,  comp:"NPL Midlands" },
];

const LEAGUE_TABLE = [
  { pos:1, name:"Leamington FC",      p:34, w:22, gd:31,  pts:70 },
  { pos:2, name:"Hednesford Town",    p:34, w:20, gd:24,  pts:64 },
  { pos:3, name:"Biggleswade FC",     p:34, w:19, gd:19,  pts:61 },
  { pos:4, name:"Cambridge City",     p:33, w:18, gd:17,  pts:58, us:true },
  { pos:5, name:"Corby Town",         p:34, w:17, gd:10,  pts:55 },
  { pos:6, name:"Rushall Olympic",    p:34, w:15, gd:4,   pts:49 },
  { pos:7, name:"Peterborough Sp.",   p:33, w:13, gd:-2,  pts:43 },
  { pos:8, name:"Bedworth United",    p:34, w:10, gd:-14, pts:35 },
];

// ─── SHARED STYLES ──────────────────────────────────────────
const S = {
  screen:  { paddingBottom:90, minHeight:"80vh" },
  card:    { margin:"8px 14px", background:CARD, borderRadius:14, padding:"13px 14px", border:"1px solid rgba(255,255,255,0.07)" },
  divider: { padding:"12px 16px 4px", fontSize:10, fontWeight:700, color:ACCENT, textTransform:"uppercase", letterSpacing:1.5 },
  secHdr:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 8px" },
  btn: (v="white") => ({
    border:"none", cursor:"pointer", borderRadius:12, padding:"11px 18px", fontSize:13, fontWeight:700,
    background: v==="white"?WHITE : v==="red"?RED : v==="green"?GREEN : "rgba(255,255,255,0.1)",
    color: v==="ghost"?WHITE:BLACK,
  }),
  input:   { background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"10px 12px", color:WHITE, fontSize:13, width:"100%", outline:"none" },
  label:   { fontSize:11, fontWeight:600, color:GRAY, marginBottom:4, display:"block", letterSpacing:0.5 },
};

const OutcomeBadge = ({ o }) => (
  <span style={{ padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:800,
    background:o==="W"?"rgba(39,174,96,0.2)":o==="L"?"rgba(231,76,60,0.2)":"rgba(255,255,255,0.12)",
    color:o==="W"?GREEN:o==="L"?RED:ACCENT }}>{o}</span>
);

// ─── HOME ───────────────────────────────────────────────────
function HomeScreen({ setTab, results, fixtures }) {
  const next = fixtures[0];
  return (
    <div style={S.screen}>
      {/* Hero next match */}
      <div style={{ margin:"16px 14px", background:"linear-gradient(135deg,#1a1a1a,#2a2a2a)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:18, padding:18, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, background:"rgba(255,255,255,0.03)", borderRadius:"50%" }}/>
        <div style={{ fontSize:10, fontWeight:700, color:ACCENT, letterSpacing:1.5, textTransform:"uppercase", marginBottom:12 }}>⚽ Next Match</div>
        {next ? (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ textAlign:"center", flex:1 }}>
                <div style={{ fontSize:14, fontWeight:900, lineHeight:1.3, color:WHITE }}>Cambridge<br/>City FC</div>
                <div style={{ fontSize:10, color:GRAY, marginTop:3 }}>{next.home?"Home":"Away"}</div>
              </div>
              <div style={{ background:WHITE, color:BLACK, borderRadius:8, padding:"6px 11px", fontWeight:900, fontSize:14, margin:"0 8px" }}>VS</div>
              <div style={{ textAlign:"center", flex:1 }}>
                <div style={{ fontSize:14, fontWeight:900, lineHeight:1.3, color:WHITE }}>{next.opponent}</div>
                <div style={{ fontSize:10, color:GRAY, marginTop:3 }}>{next.home?"Away":"Home"}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:14, fontSize:11, color:GRAY }}>
              <span>📅 {next.date}</span><span>⏰ {next.time}</span><span>📍 {next.home?"Sawston":"Away"}</span>
            </div>
          </>
        ) : <div style={{ color:GRAY, fontSize:13 }}>No upcoming fixtures</div>}
      </div>

      {/* Stats */}
      <div style={S.secHdr}><div style={{ fontSize:14, fontWeight:700 }}>Season at a Glance</div></div>
      <div style={{ display:"flex", gap:10, padding:"0 14px", overflowX:"auto", scrollbarWidth:"none" }}>
        {[["33","Played"],["18","Won"],["5","Drawn"],["58","Points"],["4th","League"]].map(([n,l])=>(
          <div key={l} style={{ background:CARD2, border:"1px solid rgba(255,255,255,0.07)", borderRadius:13, padding:"13px 14px", minWidth:78, flexShrink:0, textAlign:"center" }}>
            <div style={{ fontSize:26, fontWeight:900, color:WHITE, lineHeight:1 }}>{n}</div>
            <div style={{ fontSize:10, color:GRAY, marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* MOTM */}
      {results[0] && (
        <div style={{ margin:"14px 14px 0", background:"linear-gradient(135deg,#1a1a1a,#2d2d2d)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:16, padding:16, textAlign:"center" }}>
          <div style={{ fontSize:26, marginBottom:2 }}>👑</div>
          <div style={{ fontSize:10, color:ACCENT, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase" }}>Last Man of the Match</div>
          <div style={{ fontSize:20, fontWeight:900, marginTop:4, color:WHITE }}>{results[0].motm}</div>
          <div style={{ fontSize:12, color:GRAY, marginTop:3 }}>vs {results[0].opponent} · {results[0].date}</div>
        </div>
      )}

      {/* Recent results */}
      <div style={S.secHdr}>
        <div style={{ fontSize:14, fontWeight:700 }}>Recent Results</div>
        <div style={{ fontSize:12, color:ACCENT, fontWeight:600, cursor:"pointer" }} onClick={()=>setTab("fixtures")}>See all</div>
      </div>
      {results.slice(0,4).map(r=>(
        <div key={r.id} style={{ ...S.card, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontWeight:700, fontSize:15 }}><OutcomeBadge o={r.outcome}/>{r.score}</div>
            <div style={{ fontSize:12, color:GRAY, marginTop:3 }}>vs {r.opponent}</div>
          </div>
          <div style={{ fontSize:11, color:GRAY }}>{r.date}</div>
        </div>
      ))}
    </div>
  );
}

// ─── FIXTURES ───────────────────────────────────────────────
function FixturesScreen({ fixtures, results }) {
  return (
    <div style={S.screen}>
      <div style={S.divider}>Upcoming</div>
      {fixtures.length===0 && <div style={{ padding:"20px 16px", color:GRAY, fontSize:13 }}>No upcoming fixtures.</div>}
      {fixtures.map((f,i)=>(
        <div key={f.id||i} style={{ ...S.card, borderColor:"rgba(255,255,255,0.12)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ fontSize:11, color:GRAY, fontWeight:600 }}>{f.date} · {f.time}</div>
            <div style={{ fontSize:10, color:ACCENT, background:"rgba(255,255,255,0.1)", padding:"2px 8px", borderRadius:10, fontWeight:600 }}>{f.comp}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:14, fontWeight:700, flex:1 }}>Cambridge City</div>
            <div style={{ fontSize:13, color:GRAY, fontWeight:600, padding:"0 12px" }}>vs</div>
            <div style={{ fontSize:14, fontWeight:700, flex:1, textAlign:"right" }}>{f.opponent}</div>
          </div>
          <div style={{ fontSize:11, color:GRAY, marginTop:7 }}>{f.home?"📍 FWD-IP Community Stadium, Sawston":"📍 Away"}</div>
        </div>
      ))}
      <div style={S.divider}>Past Results</div>
      {results.map(r=>(
        <div key={r.id} style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ fontSize:11, color:GRAY, fontWeight:600 }}>{r.date}</div>
            <div style={{ fontSize:10, color:ACCENT, background:"rgba(255,255,255,0.1)", padding:"2px 8px", borderRadius:10, fontWeight:600 }}>NPL Midlands</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ fontSize:14, fontWeight:700, flex:1 }}>Cambridge City</div>
            <div style={{ fontSize:18, fontWeight:900, color:WHITE, padding:"0 10px" }}>{r.score}</div>
            <div style={{ fontSize:14, fontWeight:700, flex:1, textAlign:"right" }}>{r.opponent}</div>
          </div>
          <div style={{ fontSize:11, color:GRAY }}>⚽ {r.scorers}</div>
          <div style={{ fontSize:11, color:ACCENT, marginTop:4 }}>👑 MOTM: {r.motm}</div>
        </div>
      ))}
    </div>
  );
}

// ─── TEAM SHEET ─────────────────────────────────────────────
function TeamScreen({ players }) {
  const xi = [
    [players[0]],
    [players[1], players[3], players[4], players[2]],
    [players[7], players[5], players[11], players[6]],
    [players[8], players[9]],
  ];
  const subs = players.slice(10, 14);
  return (
    <div style={S.screen}>
      <div style={{ margin:14, background:"linear-gradient(135deg,#1a1a1a,#2a2a2a)", borderRadius:16, padding:16, textAlign:"center", border:"1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ fontSize:16, fontWeight:900, color:WHITE }}>Team Sheet</div>
        <div style={{ fontSize:12, color:ACCENT, marginTop:4 }}>vs Biggleswade FC · Sat 31 May · 3:00pm</div>
      </div>
      <div style={{ margin:"0 14px", background:"linear-gradient(180deg,#1a5c2a 0%,#1e6b30 33%,#1a5c2a 66%,#1e6b30 100%)", borderRadius:16, padding:"20px 10px", border:"2px solid rgba(255,255,255,0.1)", position:"relative" }}>
        <div style={{ position:"absolute", top:"50%", left:"8%", right:"8%", height:1, background:"rgba(255,255,255,0.2)", transform:"translateY(-50%)" }}/>
        {xi.map((row,ri)=>(
          <div key={ri} style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:ri<xi.length-1?18:0 }}>
            {row.filter(Boolean).map(p=>(
              <div key={p.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:46, height:46, borderRadius:"50%", background:WHITE, border:"2px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:BLACK }}>{p.num}</div>
                <div style={{ fontSize:9, fontWeight:700, color:WHITE, textAlign:"center", maxWidth:52, lineHeight:1.2 }}>{p.short}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ margin:"12px 14px" }}>
        <div style={{ fontSize:11, color:ACCENT, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Substitutes</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {subs.map(s=>(
            <div key={s.id} style={{ background:CARD2, border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"6px 12px", fontSize:12, display:"flex", alignItems:"center", gap:6, color:WHITE }}>
              <span style={{ color:ACCENT, fontWeight:700, fontSize:11 }}>#{s.num}</span>{s.name.split(" ")[0][0]+". "+s.name.split(" ")[1]}
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...S.secHdr, paddingTop:8 }}>
        <div style={{ fontSize:14, fontWeight:700 }}>Formation</div>
        <div style={{ background:"rgba(255,255,255,0.12)", color:WHITE, borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700 }}>4-4-2</div>
      </div>
    </div>
  );
}

// ─── SQUAD ──────────────────────────────────────────────────
function SquadScreen({ players }) {
  const [selected, setSelected] = useState(null);
  if (selected) {
    const p=selected; const c=POS_COLORS[p.pos];
    return (
      <div style={S.screen}>
        <div style={{ padding:"16px 14px 0" }}>
          <button onClick={()=>setSelected(null)} style={{ ...S.btn("ghost"), padding:"8px 14px", fontSize:13 }}>← Back</button>
        </div>
        <div style={{ margin:"14px 14px 0", background:"linear-gradient(135deg,#1a1a1a,#2a2a2a)", borderRadius:16, padding:20, textAlign:"center", border:"1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:WHITE, border:"3px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:900, color:BLACK, margin:"0 auto 10px" }}>{p.num}</div>
          <div style={{ fontSize:22, fontWeight:900, color:WHITE }}>{p.name}</div>
          <div style={{ display:"inline-block", marginTop:8, padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700, background:c.bg, color:c.text }}>{p.pos}</div>
        </div>
        <div style={{ margin:"12px 14px 0" }}>
          <div style={S.divider}>Season Stats</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", padding:"4px 14px 0" }}>
            {[["Apps",p.apps],["Goals",p.goals],["Assists",p.assists],["MOTM",p.motm],...(p.pos==="GK"?[["Clean Sheets",p.cs||0]]:[])].map(([l,v])=>(
              <div key={l} style={{ background:CARD2, borderRadius:13, padding:"13px 16px", textAlign:"center", flex:"1 0 80px" }}>
                <div style={{ fontSize:26, fontWeight:900, color:WHITE, lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:10, color:GRAY, marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  const byPos = { GK:players.filter(p=>p.pos==="GK"), DEF:players.filter(p=>p.pos==="DEF"), MID:players.filter(p=>p.pos==="MID"), FWD:players.filter(p=>p.pos==="FWD") };
  return (
    <div style={S.screen}>
      <div style={{ ...S.secHdr, paddingTop:16 }}>
        <div style={{ fontSize:14, fontWeight:700 }}>Squad 2025/26</div>
        <div style={{ fontSize:12, color:GRAY }}>{players.length} players</div>
      </div>
      {Object.entries(byPos).map(([pos,ps])=>ps.length>0&&(
        <div key={pos}>
          <div style={S.divider}>{pos==="GK"?"Goalkeeper":pos==="DEF"?"Defenders":pos==="MID"?"Midfielders":"Forwards"}</div>
          {ps.map(p=>{ const c=POS_COLORS[p.pos]; return (
            <div key={p.id} style={{ ...S.card, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }} onClick={()=>setSelected(p)}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:WHITE, border:"2px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:BLACK, flexShrink:0 }}>{p.num}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:WHITE }}>{p.name}</div>
                <div style={{ fontSize:11, color:GRAY, marginTop:2 }}>#{p.num}</div>
                <div style={{ display:"flex", gap:12, marginTop:5 }}>
                  <span style={{ fontSize:11, color:GRAY }}><strong style={{ color:WHITE }}>{p.apps}</strong> Apps</span>
                  {p.goals>0&&<span style={{ fontSize:11, color:GRAY }}><strong style={{ color:WHITE }}>{p.goals}</strong> Goals</span>}
                  {p.assists>0&&<span style={{ fontSize:11, color:GRAY }}><strong style={{ color:WHITE }}>{p.assists}</strong> Assists</span>}
                </div>
              </div>
              <div style={{ padding:"3px 9px", borderRadius:7, fontSize:10, fontWeight:700, flexShrink:0, background:c.bg, color:c.text }}>{pos}</div>
            </div>
          );})}
        </div>
      ))}
    </div>
  );
}

// ─── STATS ──────────────────────────────────────────────────
function StatsScreen({ players }) {
  const scorers   = [...players].sort((a,b)=>b.goals-a.goals).filter(p=>p.goals>0);
  const assisters = [...players].sort((a,b)=>b.assists-a.assists).filter(p=>p.assists>0);
  const motmers   = [...players].sort((a,b)=>b.motm-a.motm).filter(p=>p.motm>0);
  const LB = ({ icon, title, data, valKey }) => (
    <div style={{ margin:"0 14px 12px", background:CARD, borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ padding:"12px 14px 8px", fontSize:13, fontWeight:800, display:"flex", alignItems:"center", gap:8, color:WHITE }}>{icon} {title}</div>
      {data.slice(0,5).map((p,i)=>(
        <div key={p.id} style={{ display:"flex", alignItems:"center", padding:"10px 14px", borderBottom:i<4?"1px solid rgba(255,255,255,0.05)":"none", gap:10 }}>
          <div style={{ width:24, fontSize:13, fontWeight:800, color:i===0?WHITE:GRAY }}>{i+1}</div>
          <div style={{ flex:1, fontSize:13, fontWeight:600, color:WHITE }}>{p.name}</div>
          <div style={{ background:WHITE, color:BLACK, borderRadius:20, padding:"4px 10px", fontSize:13, fontWeight:900, minWidth:32, textAlign:"center" }}>{p[valKey]}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={S.screen}>
      <div style={{ margin:"16px 14px", background:CARD, borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ background:WHITE, color:BLACK, padding:"10px 14px", fontSize:12, fontWeight:900, letterSpacing:0.5 }}>🏆 NPL Midlands Division</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr>{["","Team","P","W","GD","Pts"].map((h,i)=>(
            <th key={i} style={{ padding:"8px 7px", textAlign:i>1?"center":"left", color:GRAY, fontWeight:600, fontSize:10, letterSpacing:0.5, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{h}</th>
          ))}</tr></thead>
          <tbody>{LEAGUE_TABLE.map(row=>(
            <tr key={row.pos} style={{ background:row.us?"rgba(255,255,255,0.08)":"transparent" }}>
              <td style={{ padding:"9px 7px", color:GRAY, fontWeight:600, width:20 }}>{row.pos}</td>
              <td style={{ padding:"9px 7px", fontWeight:row.us?900:600, color:row.us?WHITE:OFF_WHITE, fontSize:11 }}>{row.name}{row.us?" ★":""}</td>
              <td style={{ padding:"9px 7px", textAlign:"center", color:row.us?WHITE:OFF_WHITE }}>{row.p}</td>
              <td style={{ padding:"9px 7px", textAlign:"center", color:row.us?WHITE:OFF_WHITE }}>{row.w}</td>
              <td style={{ padding:"9px 7px", textAlign:"center", color:row.us?WHITE:OFF_WHITE }}>{row.gd>0?`+${row.gd}`:row.gd}</td>
              <td style={{ padding:"9px 7px", textAlign:"center", fontWeight:900, color:row.us?WHITE:OFF_WHITE }}>{row.pts}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <LB icon="🥾" title="Golden Boot"      data={scorers}   valKey="goals"   />
      <LB icon="🎯" title="Assist King"      data={assisters} valKey="assists"  />
      <LB icon="👑" title="Man of the Match" data={motmers}   valKey="motm"    />
    </div>
  );
}

// ─── AVAILABILITY ───────────────────────────────────────────
function AvailabilityScreen({ players, availability, setAvailability }) {
  const next = { date:"Sat 31 May", opponent:"Biggleswade FC" };
  const toggle = (id, status) => setAvailability(prev=>({ ...prev, [id]: prev[id]===status?null:status }));
  const avail   = players.filter(p=>availability[p.id]==="yes");
  const unavail = players.filter(p=>availability[p.id]==="no");
  const pending = players.filter(p=>!availability[p.id]);
  return (
    <div style={S.screen}>
      <div style={{ margin:"14px 14px 0", background:"linear-gradient(135deg,#1a1a1a,#2a2a2a)", borderRadius:16, padding:"14px 16px", border:"1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ fontSize:10, fontWeight:700, color:ACCENT, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>Availability For</div>
        <div style={{ fontSize:16, fontWeight:900, color:WHITE }}>vs {next.opponent}</div>
        <div style={{ fontSize:12, color:GRAY, marginTop:3 }}>{next.date} · 3:00pm</div>
        <div style={{ display:"flex", gap:12, marginTop:12 }}>
          {[[avail.length,"Available",GREEN,"rgba(39,174,96,0.15)"],[unavail.length,"Unavailable",RED,"rgba(231,76,60,0.15)"],[pending.length,"Pending",GRAY,"rgba(255,255,255,0.07)"]].map(([v,l,tc,bg])=>(
            <div key={l} style={{ textAlign:"center", flex:1, background:bg, borderRadius:10, padding:"8px 0" }}>
              <div style={{ fontSize:20, fontWeight:900, color:tc }}>{v}</div>
              <div style={{ fontSize:10, color:tc, fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.divider}>Tap to Mark Availability</div>
      {players.map(p=>{
        const s=availability[p.id];
        return (
          <div key={p.id} style={{ ...S.card, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:WHITE, border:"2px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:BLACK, flexShrink:0 }}>{p.num}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:WHITE }}>{p.name}</div>
              <div style={{ fontSize:11, color:GRAY }}>{p.pos}</div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>toggle(p.id,"yes")} style={{ width:36, height:36, borderRadius:10, border:"none", cursor:"pointer", fontSize:16, background:s==="yes"?"rgba(39,174,96,0.3)":"rgba(255,255,255,0.07)" }}>✅</button>
              <button onClick={()=>toggle(p.id,"no")}  style={{ width:36, height:36, borderRadius:10, border:"none", cursor:"pointer", fontSize:16, background:s==="no"?"rgba(231,76,60,0.3)":"rgba(255,255,255,0.07)" }}>❌</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MOTM VOTE ──────────────────────────────────────────────
function MotmScreen({ players, motmVotes, setMotmVotes }) {
  const last = { opponent:"Corby Town", date:"17 May", score:"3–1" };
  const matchPlayers = players.slice(0,11);
  const totalVotes = Object.values(motmVotes).reduce((a,b)=>a+b,0);
  const winner = totalVotes>0 ? matchPlayers.reduce((best,p)=>(motmVotes[p.id]||0)>(motmVotes[best.id]||0)?p:best, matchPlayers[0]) : null;
  const [voted, setVoted] = useState(false);
  const castVote = (id) => { if(voted)return; setMotmVotes(prev=>({...prev,[id]:(prev[id]||0)+1})); setVoted(true); };
  const sorted = [...matchPlayers].sort((a,b)=>(motmVotes[b.id]||0)-(motmVotes[a.id]||0));
  return (
    <div style={S.screen}>
      <div style={{ margin:"14px 14px 0", background:"linear-gradient(135deg,#1a1a1a,#2d2d2d)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:16, padding:16, textAlign:"center" }}>
        <div style={{ fontSize:28, marginBottom:4 }}>👑</div>
        <div style={{ fontSize:10, color:ACCENT, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase" }}>Man of the Match Vote</div>
        <div style={{ fontSize:16, fontWeight:900, marginTop:6, color:WHITE }}>vs {last.opponent}</div>
        <div style={{ fontSize:12, color:GRAY, marginTop:3 }}>{last.date} · {last.score}</div>
        {totalVotes>0 && <div style={{ fontSize:11, color:ACCENT, marginTop:8 }}>{totalVotes} vote{totalVotes!==1?"s":""} cast</div>}
      </div>
      {totalVotes>0 && winner && (
        <div style={{ ...S.card, textAlign:"center", borderColor:"rgba(255,255,255,0.2)", marginTop:12 }}>
          <div style={{ fontSize:10, color:ACCENT, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>Current Leader</div>
          <div style={{ fontSize:18, fontWeight:900, color:WHITE }}>{winner.name}</div>
          <div style={{ fontSize:12, color:GRAY, marginTop:3 }}>{motmVotes[winner.id]||0} votes · {Math.round(((motmVotes[winner.id]||0)/totalVotes)*100)}%</div>
        </div>
      )}
      <div style={S.divider}>{voted?"Results":"Cast Your Vote"}</div>
      {sorted.map(p=>{
        const v=motmVotes[p.id]||0;
        const pct=totalVotes>0?Math.round((v/totalVotes)*100):0;
        const isLeader=winner&&p.id===winner.id&&totalVotes>0;
        return (
          <div key={p.id} style={{ ...S.card, borderColor:isLeader?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.07)", cursor:voted?"default":"pointer" }} onClick={()=>castVote(p.id)}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:totalVotes>0?8:0 }}>
              <div style={{ width:42, height:42, borderRadius:"50%", background:isLeader?WHITE:CARD2, border:`2px solid ${isLeader?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.15)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:isLeader?BLACK:WHITE, flexShrink:0 }}>{p.num}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:WHITE }}>{p.name} {isLeader?"👑":""}</div>
                <div style={{ fontSize:11, color:GRAY }}>{p.pos}</div>
              </div>
              {totalVotes>0 ? (
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:15, fontWeight:800, color:isLeader?WHITE:OFF_WHITE }}>{pct}%</div>
                  <div style={{ fontSize:10, color:GRAY }}>{v} vote{v!==1?"s":""}</div>
                </div>
              ) : (
                <div style={{ background:WHITE, color:BLACK, borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700 }}>Vote</div>
              )}
            </div>
            {totalVotes>0 && (
              <div style={{ height:4, background:"rgba(255,255,255,0.08)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:isLeader?WHITE:"rgba(255,255,255,0.35)", borderRadius:4, transition:"width 0.5s" }}/>
              </div>
            )}
          </div>
        );
      })}
      {voted && <div style={{ textAlign:"center", padding:"12px 0", fontSize:12, color:GRAY }}>Your vote has been cast ✓</div>}
    </div>
  );
}

// ─── ADMIN ──────────────────────────────────────────────────
function AdminScreen({ players, setPlayers, results, setResults, fixtures, setFixtures }) {
  const [section, setSection] = useState("menu");

  function ResultEntry({ onBack }) {
    const [form, setForm] = useState({ date:"", opponent:"", home:"true", goalsFor:"", goalsAgainst:"", motm:"" });
    const [events, setEvents] = useState([]);
    const addEvent = () => setEvents(prev=>[...prev,{playerId:"",minute:"",type:"goal"}]);
    const updateEvent = (i,k,v) => setEvents(prev=>prev.map((e,idx)=>idx===i?{...e,[k]:v}:e));
    const removeEvent = (i) => setEvents(prev=>prev.filter((_,idx)=>idx!==i));
    const submit = () => {
      const gf=parseInt(form.goalsFor)||0, ga=parseInt(form.goalsAgainst)||0;
      const outcome=gf>ga?"W":gf<ga?"L":"D";
      const scorerStr=events.filter(e=>e.type==="goal"&&e.playerId).map(e=>{
        const p=players.find(pl=>pl.id===parseInt(e.playerId));
        return p?`${p.name.split(" ")[1]} ${e.minute}'`:"";
      }).filter(Boolean).join(" · ")||"—";
      const updatedPlayers=players.map(p=>{
        const pe=events.filter(e=>parseInt(e.playerId)===p.id);
        return {...p, goals:p.goals+pe.filter(e=>e.type==="goal").length, assists:p.assists+pe.filter(e=>e.type==="assist").length, apps:p.apps+1, motm:p.motm+(form.motm===String(p.id)?1:0)};
      });
      setPlayers(updatedPlayers);
      setResults(prev=>[{id:Date.now(),date:form.date||"Today",opponent:form.opponent||"Unknown",home:form.home==="true",score:`${gf}–${ga}`,outcome,scorers:scorerStr,motm:players.find(p=>p.id===parseInt(form.motm))?.name||"—"},...prev]);
      onBack();
    };
    return (
      <div style={S.screen}>
        <div style={{ padding:"14px 14px 0", display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={onBack} style={{ ...S.btn("ghost"), padding:"8px 14px", fontSize:13 }}>← Back</button>
          <div style={{ fontSize:15, fontWeight:800, color:WHITE }}>Log Match Result</div>
        </div>
        <div style={{ padding:"12px 14px 0", display:"flex", flexDirection:"column", gap:12 }}>
          <div><label style={S.label}>DATE</label><input style={S.input} placeholder="e.g. 31 May" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          <div><label style={S.label}>OPPONENT</label><input style={S.input} placeholder="e.g. Biggleswade FC" value={form.opponent} onChange={e=>setForm(f=>({...f,opponent:e.target.value}))}/></div>
          <div>
            <label style={S.label}>HOME / AWAY</label>
            <select style={S.input} value={form.home} onChange={e=>setForm(f=>({...f,home:e.target.value}))}>
              <option value="true">Home</option><option value="false">Away</option>
            </select>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1 }}><label style={S.label}>GOALS FOR</label><input style={S.input} type="number" min="0" placeholder="0" value={form.goalsFor} onChange={e=>setForm(f=>({...f,goalsFor:e.target.value}))}/></div>
            <div style={{ flex:1 }}><label style={S.label}>GOALS AGAINST</label><input style={S.input} type="number" min="0" placeholder="0" value={form.goalsAgainst} onChange={e=>setForm(f=>({...f,goalsAgainst:e.target.value}))}/></div>
          </div>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <label style={{ ...S.label, marginBottom:0 }}>GOALS & ASSISTS</label>
              <button onClick={addEvent} style={{ ...S.btn("ghost"), padding:"5px 10px", fontSize:12 }}>+ Add</button>
            </div>
            {events.map((ev,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                <select style={{ ...S.input, flex:2 }} value={ev.playerId} onChange={e=>updateEvent(i,"playerId",e.target.value)}>
                  <option value="">Player...</option>
                  {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select style={{ ...S.input, flex:1 }} value={ev.type} onChange={e=>updateEvent(i,"type",e.target.value)}>
                  <option value="goal">⚽ Goal</option><option value="assist">🎯 Assist</option>
                </select>
                <input style={{ ...S.input, flex:1 }} placeholder="min" value={ev.minute} onChange={e=>updateEvent(i,"minute",e.target.value)}/>
                <button onClick={()=>removeEvent(i)} style={{ ...S.btn("red"), padding:"8px 10px", fontSize:12, flexShrink:0 }}>✕</button>
              </div>
            ))}
          </div>
          <div>
            <label style={S.label}>MAN OF THE MATCH</label>
            <select style={S.input} value={form.motm} onChange={e=>setForm(f=>({...f,motm:e.target.value}))}>
              <option value="">Select player...</option>
              {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button onClick={submit} style={{ ...S.btn("white"), marginTop:4, padding:"13px", fontSize:14 }}>✓ Save Result</button>
        </div>
      </div>
    );
  }

  function AddFixture({ onBack }) {
    const [form, setForm] = useState({ date:"", time:"3:00pm", opponent:"", home:"true", comp:"NPL Midlands" });
    const submit = () => { if(!form.opponent)return; setFixtures(prev=>[...prev,{id:`f${Date.now()}`,...form,home:form.home==="true"}]); onBack(); };
    return (
      <div style={S.screen}>
        <div style={{ padding:"14px 14px 0", display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={onBack} style={{ ...S.btn("ghost"), padding:"8px 14px", fontSize:13 }}>← Back</button>
          <div style={{ fontSize:15, fontWeight:800, color:WHITE }}>Add Fixture</div>
        </div>
        <div style={{ padding:"12px 14px 0", display:"flex", flexDirection:"column", gap:12 }}>
          <div><label style={S.label}>DATE</label><input style={S.input} placeholder="e.g. Sat 28 Jun" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          <div><label style={S.label}>KICK-OFF TIME</label><input style={S.input} placeholder="3:00pm" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></div>
          <div><label style={S.label}>OPPONENT</label><input style={S.input} placeholder="e.g. Corby Town" value={form.opponent} onChange={e=>setForm(f=>({...f,opponent:e.target.value}))}/></div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1 }}><label style={S.label}>HOME / AWAY</label><select style={S.input} value={form.home} onChange={e=>setForm(f=>({...f,home:e.target.value}))}><option value="true">Home</option><option value="false">Away</option></select></div>
            <div style={{ flex:1 }}><label style={S.label}>COMPETITION</label><select style={S.input} value={form.comp} onChange={e=>setForm(f=>({...f,comp:e.target.value}))}><option>NPL Midlands</option><option>FA Cup</option><option>FA Trophy</option><option>Friendly</option></select></div>
          </div>
          <button onClick={submit} style={{ ...S.btn("white"), marginTop:4, padding:"13px", fontSize:14 }}>✓ Add Fixture</button>
        </div>
      </div>
    );
  }

  function AddPlayer({ onBack }) {
    const [form, setForm] = useState({ name:"", num:"", pos:"MID" });
    const submit = () => {
      if(!form.name||!form.num)return;
      setPlayers(prev=>[...prev,{id:Date.now(),num:parseInt(form.num),name:form.name,short:form.name.split(" ").map((w,i)=>i===0?w[0]+".":w).join(" "),pos:form.pos,apps:0,goals:0,assists:0,motm:0}]);
      onBack();
    };
    return (
      <div style={S.screen}>
        <div style={{ padding:"14px 14px 0", display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={onBack} style={{ ...S.btn("ghost"), padding:"8px 14px", fontSize:13 }}>← Back</button>
          <div style={{ fontSize:15, fontWeight:800, color:WHITE }}>Add Player</div>
        </div>
        <div style={{ padding:"12px 14px 0", display:"flex", flexDirection:"column", gap:12 }}>
          <div><label style={S.label}>FULL NAME</label><input style={S.input} placeholder="e.g. Joe Bloggs" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1 }}><label style={S.label}>SQUAD NUMBER</label><input style={S.input} type="number" placeholder="17" value={form.num} onChange={e=>setForm(f=>({...f,num:e.target.value}))}/></div>
            <div style={{ flex:1 }}><label style={S.label}>POSITION</label><select style={S.input} value={form.pos} onChange={e=>setForm(f=>({...f,pos:e.target.value}))}><option value="GK">GK</option><option value="DEF">DEF</option><option value="MID">MID</option><option value="FWD">FWD</option></select></div>
          </div>
          <button onClick={submit} style={{ ...S.btn("white"), marginTop:4, padding:"13px", fontSize:14 }}>✓ Add Player</button>
        </div>
      </div>
    );
  }

  if(section==="result")  return <ResultEntry onBack={()=>setSection("menu")}/>;
  if(section==="fixture") return <AddFixture  onBack={()=>setSection("menu")}/>;
  if(section==="player")  return <AddPlayer   onBack={()=>setSection("menu")}/>;

  return (
    <div style={S.screen}>
      <div style={{ margin:"14px 14px 0", background:"linear-gradient(135deg,#111,#222)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:28 }}>🔐</div>
        <div>
          <div style={{ fontSize:14, fontWeight:900, color:WHITE }}>Coach Admin Panel</div>
          <div style={{ fontSize:11, color:GRAY, marginTop:2 }}>Cambridge City FC · Season 2025/26</div>
        </div>
      </div>
      <div style={S.divider}>Quick Actions</div>
      {[
        { id:"result",  icon:"⚽", label:"Log Match Result", sub:"Enter score, goals, assists & MOTM", color:GREEN },
        { id:"fixture", icon:"📅", label:"Add Fixture",      sub:"Schedule an upcoming match",         color:"#5dade2" },
        { id:"player",  icon:"👤", label:"Add Player",       sub:"Add a new squad member",             color:WHITE },
      ].map(m=>(
        <div key={m.id} style={{ ...S.card, cursor:"pointer", display:"flex", alignItems:"center", gap:14 }} onClick={()=>setSection(m.id)}>
          <div style={{ width:48, height:48, borderRadius:14, background:`rgba(255,255,255,0.07)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{m.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:WHITE }}>{m.label}</div>
            <div style={{ fontSize:11, color:GRAY, marginTop:2 }}>{m.sub}</div>
          </div>
          <div style={{ color:GRAY, fontSize:18 }}>›</div>
        </div>
      ))}
      <div style={S.divider}>Season Overview</div>
      <div style={{ padding:"0 14px", display:"flex", gap:10 }}>
        {[["Players",players.length],["Results",results.length],["Fixtures",fixtures.length]].map(([l,v])=>(
          <div key={l} style={{ background:CARD2, borderRadius:13, padding:"12px 14px", textAlign:"center", flex:1 }}>
            <div style={{ fontSize:22, fontWeight:900, color:WHITE }}>{v}</div>
            <div style={{ fontSize:10, color:GRAY, marginTop:3, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROOT ───────────────────────────────────────────────────
export default function App() {
  const [tab,          setTab]          = useState("home");
  const [players,      setPlayers]      = useState(INIT_PLAYERS);
  const [results,      setResults]      = useState(INIT_RESULTS);
  const [fixtures,     setFixtures]     = useState(INIT_FIXTURES);
  const [availability, setAvailability] = useState({});
  const [motmVotes,    setMotmVotes]    = useState({});

  const tabs = [
    { id:"home",     icon:"🏠", label:"Home"     },
    { id:"fixtures", icon:"📅", label:"Fixtures" },
    { id:"team",     icon:"👕", label:"Team"     },
    { id:"squad",    icon:"👥", label:"Squad"    },
    { id:"stats",    icon:"📊", label:"Stats"    },
    { id:"avail",    icon:"✅", label:"Avail"    },
    { id:"motm",     icon:"👑", label:"MOTM"     },
    { id:"admin",    icon:"🔐", label:"Admin"    },
  ];

  return (
    <div style={{ background:BLACK, minHeight:"100vh", maxWidth:420, margin:"0 auto", fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:WHITE, position:"relative" }}>
      {/* Header */}
      <div style={{ background:BLACK, padding:"14px 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, background:WHITE, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:11, color:BLACK, letterSpacing:-0.5, flexShrink:0 }}>CCFC</div>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:WHITE, lineHeight:1.2 }}>Cambridge City FC</div>
            <div style={{ fontSize:11, color:GRAY, fontWeight:500 }}>The Lilywhites</div>
          </div>
        </div>
        <div style={{ background:WHITE, color:BLACK, borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:700 }}>2025/26</div>
      </div>

      {tab==="home"     && <HomeScreen     setTab={setTab} results={results} fixtures={fixtures}/>}
      {tab==="fixtures" && <FixturesScreen results={results} fixtures={fixtures}/>}
      {tab==="team"     && <TeamScreen     players={players}/>}
      {tab==="squad"    && <SquadScreen    players={players}/>}
      {tab==="stats"    && <StatsScreen    players={players}/>}
      {tab==="avail"    && <AvailabilityScreen players={players} availability={availability} setAvailability={setAvailability}/>}
      {tab==="motm"     && <MotmScreen     players={players} motmVotes={motmVotes} setMotmVotes={setMotmVotes}/>}
      {tab==="admin"    && <AdminScreen    players={players} setPlayers={setPlayers} results={results} setResults={setResults} fixtures={fixtures} setFixtures={setFixtures}/>}

      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, background:DARK, borderTop:"1px solid rgba(255,255,255,0.1)", display:"flex", zIndex:200, overflowX:"auto", scrollbarWidth:"none" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:"0 0 auto", minWidth:52, display:"flex", flexDirection:"column", alignItems:"center", padding:"9px 6px 13px", cursor:"pointer", border:"none", background:"none", color:tab===t.id?WHITE:LGRAY, gap:3, transition:"color 0.2s" }}>
            <span style={{ fontSize:18, lineHeight:1 }}>{t.icon}</span>
            <span style={{ fontSize:9, fontWeight:600, letterSpacing:0.3, whiteSpace:"nowrap" }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
