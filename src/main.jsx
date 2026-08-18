import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Trophy, Users, Swords, Shuffle, Plus, Trash2, Check, X, CircleHelp, ClipboardList, Medal, Home, RefreshCw, UserPlus, ListPlus } from "lucide-react";
import "./styles.css";

const initialPlayers = [
  { id: 1, name: "Marco", level: "alto" }, { id: 2, name: "Luca", level: "alto" },
  { id: 3, name: "Andrea", level: "alto" }, { id: 4, name: "Paolo", level: "alto" },
  { id: 5, name: "Francesco", level: "basso" }, { id: 6, name: "Matteo", level: "basso" },
  { id: 7, name: "Giuseppe", level: "basso" }, { id: 8, name: "Simone", level: "basso" }
];
const uid = () => Date.now() + Math.floor(Math.random() * 100000);
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const nextPowerOfTwo = n => Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, n))));

function makeMatch(round, a = "", b = "", type = "singolo", index = 0, auto = false) {
  return { id: uid() + index, round, a, b, type, scoreA: "", scoreB: "", status: auto ? "passaggio automatico" : "da giocare", winner: auto ? (a === "BYE" ? b : a) : null, auto };
}

function roundName(size) {
  return size === 16 ? "Ottavi" : size === 8 ? "Quarti" : size === 4 ? "Semifinali" : "Finale";
}

// Main draw is always a real 16-place knockout. If there are more than 16 entrants,
// qualification matches reduce the field to 16. If there are fewer, BYEs fill the draw.
function createMainRounds(entries, type) {
  const slots = 16;
  const participants = Array.from({ length: slots }, (_, i) => entries[i] || null);
  const rounds = [];
  let current = participants;
  for (const size of [16, 8, 4, 2]) {
    const matches = [];
    for (let i = 0; i < size / 2; i++) {
      const a = current[i * 2] || "BYE";
      const b = current[i * 2 + 1] || "BYE";
      const auto = a === "BYE" || b === "BYE";
      matches.push(makeMatch(roundName(size), a, b, type, i, auto));
    }
    rounds.push({ name: roundName(size), size, matches });
    current = Array.from({ length: size / 2 }, () => null);
  }
  return propagateWinners(rounds);
}

function createQualificationMatches(entries, type) { return { active: [...new Set(entries.filter(Boolean))], matches: [] }; }
function createQualificationMatch(active, a, b, type) { return makeMatch("Qualifiche", a, b, type, active.length, false); }
function rebuildTournament(entries, type, qualification = null) {
  const unique = [...new Set(entries.filter(Boolean))];
  const q = qualification || createQualificationMatches(unique, type);
  const active = q.active?.length ? q.active : unique;
  return { entrants: unique, qualification: { ...q, active }, rounds: createMainRounds(active.length <= 16 ? active : [], type) };
}

function App() {
  const [tab, setTab] = useState("home");
  const [players, setPlayers] = useState(initialPlayers);
  const [selectedPlayers, setSelectedPlayers] = useState(initialPlayers.map(p => p.id));
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("basso");
  const [message, setMessage] = useState("");
  const [team, setTeam] = useState(null);
  const [matchType, setMatchType] = useState("singolo");
  const [tournament, setTournament] = useState(null);
  const [manualEntry, setManualEntry] = useState("");
  const [manualMatch, setManualMatch] = useState({ a: "", b: "" });
  const [suggestSide, setSuggestSide] = useState(null);

  const high = useMemo(() => players.filter(p => p.level === "alto"), [players]);
  const low = useMemo(() => players.filter(p => p.level === "basso"), [players]);
  const allMatches = tournament ? [...(tournament.qualification?.matches || []), ...tournament.rounds.flatMap(r => r.matches)] : [];
  const completed = allMatches.filter(m => m.status === "finito").length;

  function notify(text) { setMessage(text); setTimeout(() => setMessage(""), 2600); }

  function ensurePlayers(names) {
    const normalized = names.map(n => n.trim()).filter(Boolean);
    const existing = new Set(players.map(p => p.name.toLowerCase()));
    const additions = normalized.filter(n => !existing.has(n.toLowerCase())).map(name => ({ id: uid(), name, level: "basso" }));
    if (additions.length) setPlayers(prev => [...prev, ...additions]);
    return additions;
  }

  function addPlayer(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) return notify("Questo nome è già presente.");
    setPlayers([...players, { id: uid(), name, level: newLevel }]);
    setNewName(""); notify("Giocatore aggiunto!");
  }
  function removePlayer(id) { setPlayers(players.filter(p => p.id !== id)); }

  function generateRandomSingles() {
    if (players.length < 2) return notify("Servono almeno 2 giocatori.");
    const p = shuffle(players); setTeam({ high: p[0], low: p[1], single: true }); notify("Due singoli casuali generati!");
  }
  function generateTeam() {
    if (!high.length || !low.length) return notify("Per un doppio equilibrato servono almeno un alto e un basso.");
    const h = shuffle(high)[0], l = shuffle(low)[0]; setTeam({ high: h, low: l, single: false }); notify("Coppia casuale generata!");
  }
  function generateRandom() { matchType === "singolo" ? generateRandomSingles() : generateTeam(); }

  function startTournament() {
    const selected = players.filter(p => selectedPlayers.includes(p.id));
    const entries = selected.map(p => p.name);
    if (entries.length < 2) return notify("Seleziona almeno 2 partecipanti.");
    const rebuilt = rebuildTournament(entries, matchType);
    setTournament({ type: matchType, ...rebuilt, createdAt: Date.now() });
    setTab("tournament");
    notify(entries.length > 16 ? "Partecipanti registrati. Ora crea i match di qualificazione." : "Partecipanti registrati. Ora puoi creare i match.");
  }

  function toggleParticipant(id) {
    setSelectedPlayers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleAllParticipants() {
    setSelectedPlayers(prev => prev.length === players.length ? [] : players.map(p => p.id));
  }

  function buildRandomTeams() {
    if (players.length < 4) return [];
    const pool = shuffle(players); const teams = [];
    for (let i = 0; i + 1 < pool.length; i += 2) teams.push(`${pool[i].name} / ${pool[i + 1].name}`);
    return teams;
  }

  function addManualEntry() {
    const name = manualEntry.trim(); if (!name) return;
    const current = tournament?.entrants || [];
    if (current.some(x => x.toLowerCase() === name.toLowerCase())) return notify("Partecipante già presente.");
    if (matchType === "singolo") ensurePlayers([name]);
    else ensurePlayers(name.split("/").map(x => x.trim()));
    const entries = [...current, name];
    setManualEntry("");
    setTournament(t => t ? { ...t, ...rebuildTournament(entries, t.type, t.qualificationMatches) } : t);
  }

  function randomizeTournament() {
    if (!tournament) return;
    const entries = shuffle(tournament.entrants);
    setTournament({ ...tournament, ...rebuildTournament(entries, tournament.type) });
    notify("Tabellone e qualifiche rimescolati casualmente.");
  }

  function updateMatch(id, side, value, qualification = false) {
    setTournament(t => { if (!t) return t;
      if (qualification) return { ...t, qualification: { ...t.qualification, matches: t.qualification.matches.map(m => m.id === id ? { ...m, [side]: value } : m) } };
      return { ...t, rounds: t.rounds.map(r => ({ ...r, matches: r.matches.map(m => m.id === id ? { ...m, [side]: value } : m) })) };
    });
  }

  function saveResult(id, qualification = false) {
    setTournament(t => { if (!t) return t;
      if (qualification) {
        const match = t.qualification.matches.find(m => m.id === id); if (!match || match.status === "finito") return t;
        const a=Number(match.scoreA), b=Number(match.scoreB); if(match.scoreA===""||match.scoreB===""||a===b||!Number.isFinite(a)||!Number.isFinite(b)) return t;
        const winner=a>b?match.a:match.b, loser=winner===match.a?match.b:match.a;
        const qualification={...t.qualification, active:t.qualification.active.filter(x=>x!==loser), matches:t.qualification.matches.map(m=>m.id===id?{...m,status:"finito",winner}:m)};
        return {...t,qualification,rounds:createMainRounds(qualification.active.length<=16?qualification.active:[],t.type)};
      }
      const rounds=t.rounds.map(r=>({...r,matches:r.matches.map(m=>{if(m.id!==id||m.auto)return m;const a=Number(m.scoreA),b=Number(m.scoreB);if(m.scoreA===""||m.scoreB===""||a===b||!Number.isFinite(a)||!Number.isFinite(b))return m;return {...m,status:"finito",winner:a>b?m.a:m.b};})}));
      return {...t,rounds:propagateWinners(rounds)};
    });
  }

  function addQualificationMatchRandom() {
    if (!tournament || tournament.qualification.active.length<=16) return notify("Le qualifiche sono concluse: sono rimasti 16 partecipanti.");
    const busy=new Set(tournament.qualification.matches.filter(m=>m.status!=="finito").flatMap(m=>[m.a,m.b]));
    const active=shuffle(tournament.qualification.active.filter(x=>!busy.has(x)));
    if(active.length<2) return notify("Tutti i partecipanti disponibili sono già impegnati in un match non concluso.");
    const m=createQualificationMatch(active,active[0],active[1],tournament.type);
    setTournament(t=>({...t,qualification:{...t.qualification,matches:[...t.qualification.matches,m]}})); notify("Match di qualifica casuale creato.");
  }

  function addQualificationMatchManual() {
    if (!tournament || tournament.qualification.active.length<=16) return notify("Le qualifiche sono concluse.");
    const a=manualMatch.a.trim(),b=manualMatch.b.trim(); if(!a||!b||a.toLowerCase()===b.toLowerCase()) return notify("Inserisci due partecipanti diversi.");
    const busy=new Set(tournament.qualification.matches.filter(m=>m.status!=="finito").flatMap(m=>[m.a,m.b]));
    const active=tournament.qualification.active;
    const realA=active.find(x=>x.toLowerCase()===a.toLowerCase()) || a;
    const realB=active.find(x=>x.toLowerCase()===b.toLowerCase()) || b;
    if(busy.has(realA)||busy.has(realB)) return notify("Uno dei partecipanti è già impegnato in un match non concluso.");
    const split=n=>tournament.type==='doppio'?n.split('/').map(x=>x.trim()).filter(Boolean):[n];
    ensurePlayers([...split(a),...split(b)]);
    const newActive=[...active]; if(!newActive.some(x=>x.toLowerCase()===realA.toLowerCase())) newActive.push(realA); if(!newActive.some(x=>x.toLowerCase()===realB.toLowerCase())) newActive.push(realB);
    const m=createQualificationMatch(newActive,realA,realB,tournament.type);
    setTournament(t=>({...t,entrants:[...t.entrants,...[realA,realB].filter(x=>!t.entrants.some(e=>e.toLowerCase()===x.toLowerCase()))],qualification:{...t.qualification,active:newActive,matches:[...t.qualification.matches,m]}}));
    setManualMatch({a:"",b:""}); notify("Match creato: i nomi nuovi sono stati iscritti automaticamente.");
  }

  function suggestedNames(value) { const q=value.trim().toLowerCase(); return q?players.filter(p=>p.name.toLowerCase().includes(q)).slice(0,6):players.slice(0,6); }

  const nav = [["home", "Dashboard", Home], ["players", "Giocatori", Users], ["tournament", "Torneo", Trophy], ["matches", "Match", Swords], ["teams", "Casuali", Shuffle]];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon">🍳</div><div><strong>IL DOPPIO<br/>CHE SDOPPIA</strong><span>TORNEO AMATORIALE</span></div></div>
        <nav>{nav.map(([id, label, Icon]) => <button key={id} className={tab === id ? "nav active" : "nav"} onClick={() => setTab(id)}><Icon size={19}/>{label}</button>)}</nav>
        <div className="sidebar-racket">🎾<span>🎾</span>🏓</div>
        <div className="tip"><CircleHelp size={16}/><span>Organizza, gioca,<br/>segna il punto.</span></div>
      </aside>
      <main>
        <header className="topbar"><div className="mobile-brand">🍳 <b>DOPPIO CHE SDOPPIA</b></div><div className="top-actions"><span className="status-dot"/> {tournament ? "Torneo attivo" : "Pronto a giocare"}</div></header>
        <div className="content">
          {message && <div className="toast">{message}<button onClick={() => setMessage("")}><X size={15}/></button></div>}
          {tab === "home" && (
            <>
              <section className="hero"><div><p className="eyebrow">TORNEO DI TENNIS AMATORIALE</p><h1>Il Doppio<br/><span>che Sdoppia.</span></h1><p className="hero-copy">Un vero torneo: fase di qualificazione fino a 16 partecipanti, poi ottavi, quarti, semifinali e finale.</p><div className="hero-buttons"><button className="btn black" onClick={() => setTab("tournament")}><Trophy size={18}/> Apri torneo</button><button className="btn yellow" onClick={() => setTab("teams")}><Shuffle size={18}/> Casualità</button></div></div><div className="hero-art"><div className="pan">🍳</div><div className="racket">🎾</div><div className="ball">●</div></div></section>
              <section className="stats"><div><Users/><b>{players.length}</b><span>Giocatori iscritti</span></div><div><Medal/><b>{high.length}</b><span>Livello alto</span></div><div><Medal/><b>{low.length}</b><span>Principianti</span></div><div><ClipboardList/><b>{completed}/{allMatches.length || 0}</b><span>Match conclusi</span></div></section>
              {tournament ? <TournamentBoard tournament={tournament} updateMatch={updateMatch} saveResult={saveResult} addQualificationMatchRandom={addQualificationMatchRandom} addQualificationMatchManual={addQualificationMatchManual} manualMatch={manualMatch} setManualMatch={setManualMatch} suggestedNames={suggestedNames} /> : (
                <div className="card tournament-create">
                  <div className="tournament-create-head"><div><p className="eyebrow">1 · PARTECIPANTI</p><h3>Seleziona chi partecipa</h3><p>Il torneo usa solo gli iscritti selezionati qui. Dopo la creazione, i singoli match li decidi tu.</p></div><button className="btn" onClick={toggleAllParticipants}>{selectedPlayers.length === players.length ? "Deseleziona tutti" : "Seleziona tutti"}</button></div>
                  <div className="participant-select-grid">{players.map(p => <button type="button" key={p.id} className={`participant-select ${selectedPlayers.includes(p.id) ? "selected" : ""}`} onClick={() => toggleParticipant(p.id)}><span className="avatar">{p.name.charAt(0).toUpperCase()}</span><span><b>{p.name}</b><small>{p.level === "alto" ? "LIVELLO ALTO" : "PRINCIPIANTE"}</small></span><Check size={17}/></button>)}</div>
                  <div className="tournament-create-footer"><TypeToggle value={matchType} onChange={setMatchType}/><span><b>{selectedPlayers.length}</b> partecipanti selezionati</span><button className="btn black" onClick={startTournament}><Trophy size={17}/> Crea torneo</button></div>
                </div>
              )}
            </>
          )}
          {tab === "players" && <section className="page"><p className="eyebrow">ROSTER</p><h1>Giocatori</h1><div className="two-col"><div className="card"><h3><Plus size={18}/> Aggiungi giocatore</h3><form onSubmit={addPlayer} className="form"><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome e cognome"/><select value={newLevel} onChange={e => setNewLevel(e.target.value)}><option value="alto">Livello alto</option><option value="basso">Principiante / livello basso</option></select><button className="btn black" type="submit">Aggiungi</button></form></div><div className="card split-card"><div><span className="pill high">LIVELLO ALTO</span><strong>{high.length}</strong><small>giocatori</small></div><div><span className="pill low">PRINCIPIANTI</span><strong>{low.length}</strong><small>giocatori</small></div></div></div><div className="players-grid">{players.map(p => <div className="player-card" key={p.id}><div className="avatar">{p.name.charAt(0).toUpperCase()}</div><div><strong>{p.name}</strong><span className={p.level === "alto" ? "pill high" : "pill low"}>{p.level === "alto" ? "ALTO" : "PRINCIPIANTE"}</span></div><button className="icon-btn danger" onClick={() => removePlayer(p.id)}><Trash2 size={17}/></button></div>)}</div></section>}
          {tab === "tournament" && <section className="page"><p className="eyebrow">TORNEO VERO E PROPRIO</p><h1>Tabellone</h1><div className="tournament-tools"><button className="btn black" onClick={() => { setTournament(null); setTab("home"); }}>Nuovo torneo</button><button className="btn yellow" onClick={randomizeTournament} disabled={!tournament}><RefreshCw size={17}/> Rimescola</button></div><div className="card match-rule"><b>I match li crei tu.</b> In qualificazione puoi scegliere i partecipanti dalla lista, scriverli manualmente oppure generare una sfida casuale. Un nome nuovo viene iscritto automaticamente.</div>{tournament ? <TournamentBoard tournament={tournament} updateMatch={updateMatch} saveResult={saveResult} addQualificationMatchRandom={addQualificationMatchRandom} addQualificationMatchManual={addQualificationMatchManual} manualMatch={manualMatch} setManualMatch={setManualMatch} suggestedNames={suggestedNames}/> : <div className="card empty">Nessun torneo ancora.</div>}</section>}
          {tab === "matches" && <section className="page"><p className="eyebrow">RISULTATI</p><h1>Match</h1>{tournament ? <TournamentBoard tournament={tournament} updateMatch={updateMatch} saveResult={saveResult} addQualificationMatchRandom={addQualificationMatchRandom} addQualificationMatchManual={addQualificationMatchManual} manualMatch={manualMatch} setManualMatch={setManualMatch} suggestedNames={suggestedNames}/> : <div className="card empty">Crea prima un torneo.</div>}</section>}
          {tab === "teams" && <section className="page team-page"><p className="eyebrow">MIX AUTOMATICO</p><h1>Casuali</h1><div className="type-choice"><TypeToggle value={matchType} onChange={setMatchType}/></div><p className="lead">La modalità casuale funziona sia per <b>singoli</b> sia per <b>doppio</b>.</p><div className="generator card"><div className="generator-art">🍳<span>+</span>🎾</div><button className="big-shuffle" onClick={generateRandom}><Shuffle size={24}/> {matchType === "singolo" ? "ESTRAI DUE SINGOLI" : "SDOPPIA!"}</button>{team ? <div className="generated"><div className="team-person high-side"><span>{team.single ? "SINGOLO A" : "ALTO"}</span><b>{team.high.name}</b></div><div className="plus">+</div><div className="team-person low-side"><span>{team.single ? "SINGOLO B" : "BASSO"}</span><b>{team.low.name}</b></div></div> : <div className="placeholder">Premi il pulsante per creare una combinazione casuale.</div>}</div></section>}
        </div>
      </main>
    </div>
  );
}

function propagateWinners(rounds) {
  const out = rounds.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }));
  for (let r = 0; r < out.length - 1; r++) {
    out[r].matches.forEach((m, i) => {
      const winner = m.winner;
      const next = out[r + 1].matches[Math.floor(i / 2)];
      if (!next) return;
      const side = i % 2 === 0 ? "a" : "b";
      if (winner) next[side] = winner;
      else if (!m.auto && m.status !== "finito") next[side] = "IN ATTESA";
    });
  }
  return out;
}

function TypeToggle({ value, onChange }) { return <div className="type-toggle"><button className={value==='singolo'?'selected':''} onClick={()=>onChange('singolo')}><Swords size={15}/> Singolo</button><button className={value==='doppio'?'selected':''} onClick={()=>onChange('doppio')}><Users size={15}/> Doppio</button></div>; }

function PlayerSuggest({ value, onChange, players, suggestedNames, onPick, placeholder }) {
  const list = suggestedNames(value);
  return <div className="autocomplete"><input value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>{}} placeholder={placeholder}/>{value.trim() && <div className="suggestions">{list.map(p=><button type="button" key={p.id} onClick={()=>onPick(p.name)}><span>{p.name}</span><small>ISCRITTO</small></button>)}{!players.some(p=>p.name.toLowerCase()===value.trim().toLowerCase()) && <div className="new-suggestion"><span>“{value.trim()}”</span><small>NUOVO ISCRITTO</small></div>}</div>}</div>;
}

function TournamentBoard({ tournament, updateMatch, saveResult, addQualificationMatchRandom, addQualificationMatchManual, manualMatch, setManualMatch, suggestSide, setSuggestSide, suggestedNames }) {
  const players = useMemo(() => tournament.entrants.flatMap(x => x.split("/").map(s => s.trim())), [tournament.entrants]);
  const fakePlayers = players.map((name, i) => ({ id: i, name }));
  return <div className="bracket-wrap">
    <div className="bracket-summary card"><div><span className="pill high">{tournament.type.toUpperCase()}</span><strong>{tournament.entrants.length}</strong><small>partecipanti iscritti</small></div><div><Trophy size={20}/><strong>ELIMINAZIONE DIRETTA</strong><small>{tournament.qualification?.matches?.length ? "qualifiche + ottavi + quarti + semifinali + finale" : "ottavi + quarti + semifinali + finale"}</small></div></div>
    {tournament.entrants.length > 16 && <section className="qualification-section card"><div className="qualification-head"><div><p className="eyebrow">FASE DI QUALIFICAZIONE</p><h2>Qualifiche</h2><p>Non è ancora eliminazione diretta. Ogni match elimina solo il perdente; il vincitore rimane in corsa e può giocare altri match. Si continua finché restano 16 partecipanti.</p><strong>{tournament.qualification.active.length} ancora in corsa</strong></div><button className="btn yellow" onClick={addQualificationMatchRandom}><Shuffle size={16}/> Match casuale</button></div>
      <div className="manual-qualifier"><div className="qualifier-field"><label>PARTECIPANTE A</label><PlayerSuggest value={manualMatch?.a||""} onChange={v=>setManualMatch({...manualMatch,a:v})} players={fakePlayers} suggestedNames={suggestedNames} onPick={v=>setManualMatch({...manualMatch,a:v})} placeholder="Cerca o scrivi un nome…"/></div><div className="qual-vs">VS</div><div className="qualifier-field"><label>PARTECIPANTE B</label><PlayerSuggest value={manualMatch?.b||""} onChange={v=>setManualMatch({...manualMatch,b:v})} players={fakePlayers} suggestedNames={suggestedNames} onPick={v=>setManualMatch({...manualMatch,b:v})} placeholder="Cerca o scrivi un nome…"/></div><button className="btn black" onClick={addQualificationMatchManual}><Plus size={16}/> Crea match</button></div>
      <div className="qualification-grid">{tournament.qualification.matches.map(m=><BracketMatch key={m.id} match={m} updateMatch={updateMatch} saveResult={saveResult} qualification/>)}</div>
    </section>}
    {tournament.entrants.length > 16 && tournament.qualification.active.length > 16 && <div className="card empty">Genera e completa i match finché restano 16 partecipanti. Ogni risultato elimina il perdente.</div>}
    <div className="bracket"><div className="round"><div className="round-title">Ottavi</div>{tournament.rounds[0]?.matches.map(m=><BracketMatch key={m.id} match={m} updateMatch={updateMatch} saveResult={saveResult}/>)}</div><div className="round"><div className="round-title">Quarti</div>{tournament.rounds[1]?.matches.map(m=><BracketMatch key={m.id} match={m} updateMatch={updateMatch} saveResult={saveResult}/>)}</div><div className="round"><div className="round-title">Semifinali</div>{tournament.rounds[2]?.matches.map(m=><BracketMatch key={m.id} match={m} updateMatch={updateMatch} saveResult={saveResult}/>)}</div><div className="round"><div className="round-title">Finale</div>{tournament.rounds[3]?.matches.map(m=><BracketMatch key={m.id} match={m} updateMatch={updateMatch} saveResult={saveResult}/>)}</div></div>
  </div>;
}

function BracketMatch({ match, updateMatch, saveResult, qualification = false }) {
  return <div className={'bracket-match '+(match.status==='finito'?'finished':'')}><div className="bracket-type">{qualification ? "QUALIFICA" : match.auto ? "BYE" : match.status==='finito'?'FINITO':'DA GIOCARE'}</div><div className={match.winner===match.a?'winner':''}>{match.a || 'IN ATTESA'}</div><div className={match.winner===match.b?'winner':''}>{match.b || 'IN ATTESA'}</div>{!match.auto && <div className="bracket-score"><input type="number" min="0" value={match.scoreA} onChange={e=>updateMatch(match.id,'scoreA',e.target.value,qualification)}/><b>—</b><input type="number" min="0" value={match.scoreB} onChange={e=>updateMatch(match.id,'scoreB',e.target.value,qualification)}/><button onClick={()=>saveResult(match.id,qualification)} title="Salva"><Check size={15}/></button></div>}</div>;
}

createRoot(document.getElementById("root")).render(<App/>);
