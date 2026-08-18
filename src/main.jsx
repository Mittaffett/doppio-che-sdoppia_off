import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Trophy, Users, Swords, Shuffle, Plus, Trash2, RotateCcw,
  Check, X, ChevronDown, CircleHelp, ClipboardList, Medal, Home
} from "lucide-react";
import "./styles.css";

const initialPlayers = [
  { id: 1, name: "Marco", level: "alto" },
  { id: 2, name: "Luca", level: "alto" },
  { id: 3, name: "Andrea", level: "alto" },
  { id: 4, name: "Paolo", level: "alto" },
  { id: 5, name: "Francesco", level: "basso" },
  { id: 6, name: "Matteo", level: "basso" },
  { id: 7, name: "Giuseppe", level: "basso" },
  { id: 8, name: "Simone", level: "basso" }
];

const initialMatches = [
  { id: 1, type: "singolo", round: "Quarti", a: "Marco", b: "Matteo", scoreA: "", scoreB: "", status: "da giocare" },
  { id: 2, type: "singolo", round: "Quarti", a: "Luca", b: "Francesco", scoreA: "", scoreB: "", status: "da giocare" },
  { id: 3, type: "doppio", round: "Semifinale", a: "Andrea / Giuseppe", b: "Paolo / Simone", scoreA: "", scoreB: "", status: "da giocare" }
];

const uid = () => Date.now() + Math.floor(Math.random() * 10000);

function App() {
  const [tab, setTab] = useState("home");
  const [players, setPlayers] = useState(initialPlayers);
  const [matches, setMatches] = useState(initialMatches);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("basso");
  const [team, setTeam] = useState(null);
  const [message, setMessage] = useState("");
  const [teamPicker, setTeamPicker] = useState(null);

  const high = useMemo(() => players.filter(p => p.level === "alto"), [players]);
  const low = useMemo(() => players.filter(p => p.level === "basso"), [players]);
  const completed = matches.filter(m => m.status === "finito").length;

  function addPlayer(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setPlayers([...players, { id: uid(), name: newName.trim(), level: newLevel }]);
    setNewName("");
    setMessage("Giocatore aggiunto!");
  }

  function removePlayer(id) {
    setPlayers(players.filter(p => p.id !== id));
  }

  function generateTeam() {
    if (!high.length || !low.length) {
      setMessage("Servono almeno un giocatore di livello alto e uno di livello basso.");
      setTeam(null);
      return;
    }
    const h = high[Math.floor(Math.random() * high.length)];
    const l = low[Math.floor(Math.random() * low.length)];
    setTeam({ high: h, low: l });
    setMessage("Squadra generata casualmente!");
  }

  function createTeamsForMatch(matchId) { const match=matches.find(m=>m.id===matchId); if(!match||match.type!=="doppio") return; setTeamPicker({matchId,teamA:match.a.split(" / ").filter(Boolean),teamB:match.b.split(" / ").filter(Boolean)}); }
  function saveTeamsForMatch(matchId,teamA,teamB) { if(teamA.length!==2||teamB.length!==2||new Set([...teamA,...teamB]).size!==4){setMessage("Scegli 4 giocatori diversi, 2 per squadra.");return;} setMatches(matches.map(m=>m.id===matchId?{...m,a:`${teamA[0]} / ${teamA[1]}`,b:`${teamB[0]} / ${teamB[1]}`}:m)); setTeamPicker(null); setMessage("Squadre del match aggiornate!"); }
  function randomTeamsForMatch(matchId) { if(high.length<2||low.length<2){setMessage("Servono almeno 2 giocatori di livello alto e 2 di livello basso.");return;} const hs=[...high].sort(()=>Math.random()-.5),ls=[...low].sort(()=>Math.random()-.5); saveTeamsForMatch(matchId,[hs[0].name,ls[0].name],[hs[1].name,ls[1].name]); }

  function addMatch(type) {
    const pool = [...players].sort(() => Math.random() - 0.5);
    if (type === "singolo" && pool.length >= 2) {
      setMatches([...matches, {
        id: uid(), type, round: "Nuovo match", a: pool[0].name, b: pool[1].name,
        scoreA: "", scoreB: "", status: "da giocare"
      }]);
    } else if (type === "doppio" && pool.length >= 4) {
      setMatches([...matches, {
        id: uid(), type, round: "Nuovo match",
        a: `${pool[0].name} / ${pool[1].name}`,
        b: `${pool[2].name} / ${pool[3].name}`,
        scoreA: "", scoreB: "", status: "da giocare"
      }]);
    } else {
      setMessage(type === "singolo" ? "Servono almeno 2 giocatori." : "Servono almeno 4 giocatori.");
    }
  }

  function updateScore(id, side, value) {
    setMatches(matches.map(m => m.id === id ? { ...m, [side]: value } : m));
  }

  function saveResult(id) {
    setMatches(matches.map(m => {
      if (m.id !== id) return m;
      const a = Number(m.scoreA), b = Number(m.scoreB);
      if (!Number.isFinite(a) || !Number.isFinite(b) || m.scoreA === "" || m.scoreB === "" || a === b) return m;
      return { ...m, status: "finito" };
    }));
  }

  function deleteMatch(id) {
    setMatches(matches.filter(m => m.id !== id));
  }

  const nav = [
    ["home", "Dashboard", Home],
    ["players", "Giocatori", Users],
    ["matches", "Match", Swords],
    ["teams", "Squadre casuali", Shuffle]
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🍳</div>
          <div><strong>IL DOPPIO<br/>CHE SDOPPIA</strong><span>TORNEO AMATORIALE</span></div>
        </div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? "nav active" : "nav"} onClick={() => setTab(id)}>
              <Icon size={19}/>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-racket">🎾<span>🎾</span>🏓</div>
        <div className="tip"><CircleHelp size={16}/><span>Organizza, gioca,<br/>segna il punto.</span></div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand">🍳 <b>DOPPIO CHE SDOPPIA</b></div>
          <div className="top-actions">
            <span className="status-dot"></span> Torneo attivo
          </div>
        </header>

        <div className="content">
          {message && <div className="toast">{message}<button onClick={() => setMessage("")}><X size={15}/></button></div>}

          {tab === "home" && (
            <>
              <section className="hero">
                <div>
                  <p className="eyebrow">TORNEO DI TENNIS AMATORIALE</p>
                  <h1>Il Doppio<br/><span>che Sdoppia.</span></h1>
                  <p className="hero-copy">Una racchetta, una padella e tanta voglia di vincere.<br/>Gestisci giocatori, match, punteggi e coppie.</p>
                  <div className="hero-buttons">
                    <button className="btn black" onClick={() => setTab("matches")}><Swords size={18}/> Gestisci match</button>
                    <button className="btn yellow" onClick={() => setTab("teams")}><Shuffle size={18}/> Genera squadra</button>
                  </div>
                </div>
                <div className="hero-art">
                  <div className="pan">🍳</div>
                  <div className="racket">🎾</div>
                  <div className="ball">●</div>
                </div>
              </section>

              <section className="stats">
                <div><Users/><b>{players.length}</b><span>Giocatori</span></div>
                <div><Medal/><b>{high.length}</b><span>Livello alto</span></div>
                <div><Medal/><b>{low.length}</b><span>Principianti</span></div>
                <div><ClipboardList/><b>{completed}/{matches.length}</b><span>Match conclusi</span></div>
              </section>

              <section className="section">
                <div className="section-title"><div><p className="eyebrow">PANORAMICA</p><h2>Prossimi match</h2></div><button className="text-btn" onClick={() => setTab("matches")}>Vedi tutti →</button></div>
                <MatchList matches={matches.slice(0,3)} updateScore={updateScore} saveResult={saveResult} deleteMatch={deleteMatch} createTeamsForMatch={createTeamsForMatch} randomTeamsForMatch={randomTeamsForMatch}/>
              </section>
            </>
          )}

          {tab === "players" && (
            <section className="page">
              <p className="eyebrow">ROSTER</p><h1>Giocatori</h1>
              <div className="two-col">
                <div className="card">
                  <h3><Plus size={18}/> Aggiungi giocatore</h3>
                  <form onSubmit={addPlayer} className="form">
                    <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nome e cognome" />
                    <select value={newLevel} onChange={e=>setNewLevel(e.target.value)}>
                      <option value="alto">Livello alto</option>
                      <option value="basso">Principiante / livello basso</option>
                    </select>
                    <button className="btn black" type="submit">Aggiungi</button>
                  </form>
                </div>
                <div className="card split-card">
                  <div><span className="pill high">LIVELLO ALTO</span><strong>{high.length}</strong><small>giocatori</small></div>
                  <div><span className="pill low">PRINCIPIANTI</span><strong>{low.length}</strong><small>giocatori</small></div>
                </div>
              </div>
              <div className="players-grid">
                {players.map(p => <div className="player-card" key={p.id}>
                  <div className="avatar">{p.name.charAt(0).toUpperCase()}</div>
                  <div><strong>{p.name}</strong><span className={p.level === "alto" ? "pill high" : "pill low"}>{p.level === "alto" ? "ALTO" : "PRINCIPIANTE"}</span></div>
                  <button className="icon-btn danger" onClick={() => removePlayer(p.id)}><Trash2 size={17}/></button>
                </div>)}
              </div>
            </section>
          )}

          {tab === "matches" && (
            <section className="page">
              <p className="eyebrow">TABELLONE & RISULTATI</p><h1>Match</h1>
              <div className="toolbar">
                <button className="btn black" onClick={() => addMatch("singolo")}><Plus size={17}/> Nuovo singolo</button>
                <button className="btn yellow" onClick={() => addMatch("doppio")}><Plus size={17}/> Nuovo doppio</button>
              </div>
              <MatchList matches={matches} updateScore={updateScore} saveResult={saveResult} deleteMatch={deleteMatch} createTeamsForMatch={createTeamsForMatch} randomTeamsForMatch={randomTeamsForMatch}/>
            </section>
          )}

          {tab === "teams" && (
            <section className="page team-page">
              <p className="eyebrow">MIX AUTOMATICO</p><h1>Generatore di squadre</h1>
              <p className="lead">Ogni coppia viene composta da <b>un giocatore di livello alto</b> + <b>un giocatore di livello basso</b>.</p>
              <div className="generator card">
                <div className="generator-art">🍳<span>+</span>🎾</div>
                <button className="big-shuffle" onClick={generateTeam}><Shuffle size={24}/> SDOPPIA!</button>
                {team ? <div className="generated">
                  <div className="team-person high-side"><span>ALTO</span><b>{team.high.name}</b></div>
                  <div className="plus">+</div>
                  <div className="team-person low-side"><span>BASSO</span><b>{team.low.name}</b></div>
                </div> : <div className="placeholder">Premi “SDOPPIA!” per creare una coppia casuale.</div>}
              </div>
              <div className="rules card">
                <h3>Regole del generatore</h3>
                <p>🎾 Estrae casualmente un giocatore dalla fascia <b>livello alto</b>.</p>
                <p>🍳 Estrae casualmente un giocatore dalla fascia <b>principianti/livello basso</b>.</p>
                <p>🔀 Ogni pressione genera una nuova combinazione.</p>
              </div>
            </section>
          )}
          {teamPicker && <TeamPickerModal match={matches.find(m=>m.id===teamPicker.matchId)} players={players} initialA={teamPicker.teamA} initialB={teamPicker.teamB} onClose={()=>setTeamPicker(null)} onSave={(a,b)=>saveTeamsForMatch(teamPicker.matchId,a,b)} onRandom={()=>randomTeamsForMatch(teamPicker.matchId)}/>}
        </div>
      </main>
    </div>
  );
}

function MatchList({matches, updateScore, saveResult, deleteMatch, createTeamsForMatch, randomTeamsForMatch}) {
  if (!matches.length) return <div className="empty card">Nessun match creato.</div>;
  return <div className="matches">
    {matches.map(m => <div className="match card" key={m.id}>
      <div className="match-head">
        <span className={m.type === "doppio" ? "type double" : "type single"}>{m.type === "doppio" ? "DOPPIO" : "SINGOLO"}</span>
        <span>{m.round}</span>
        <span className={m.status === "finito" ? "done" : "waiting"}>{m.status === "finito" ? "● FINITO" : "○ DA GIOCARE"}</span>
      </div>
      <div className="match-body">
        <div className="players"><strong>{m.a}</strong><span>vs</span><strong>{m.b}</strong></div>{m.type === "doppio" && <div className="team-actions"><button className="mini-btn" onClick={()=>createTeamsForMatch(m.id)}><Users size={14}/> Crea squadre</button><button className="mini-btn yellow-mini" onClick={()=>randomTeamsForMatch(m.id)}><Shuffle size={14}/> Casuali</button></div>}
        <div className="score">
          <input type="number" min="0" value={m.scoreA} onChange={e=>updateScore(m.id,"scoreA",e.target.value)} />
          <b>—</b>
          <input type="number" min="0" value={m.scoreB} onChange={e=>updateScore(m.id,"scoreB",e.target.value)} />
        </div>
        <button className="save-score" onClick={() => saveResult(m.id)} title="Salva risultato"><Check size={18}/></button>
        <button className="icon-btn danger" onClick={() => deleteMatch(m.id)} title="Elimina"><Trash2 size={17}/></button>
      </div>
    </div>)}
  </div>;
}

function PlayerAutocomplete({value, onChange, players, placeholder, excluded}) {
  const [open, setOpen] = useState(false);
  const query = value.trim().toLowerCase();
  const suggestions = players
    .filter(p => !excluded.includes(p.name))
    .filter(p => !query || p.name.toLowerCase().includes(query))
    .slice(0, 6);

  return (
    <div className="autocomplete">
      <input
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map(p => (
            <button
              type="button"
              key={p.id}
              onMouseDown={() => { onChange(p.name); setOpen(false); }}
            >
              <span>{p.name}</span>
              <small>{p.level === "alto" ? "LIVELLO ALTO" : "PRINCIPIANTE"}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamPickerModal({match, players, initialA, initialB, onClose, onSave, onRandom}) {
  const [a, setA] = useState([initialA[0] || "", initialA[1] || ""]);
  const [b, setB] = useState([initialB[0] || "", initialB[1] || ""]);

  const allSelected = [...a, ...b].filter(Boolean);

  function setPlayer(side, index, value) {
    const current = side === "a" ? [...a] : [...b];
    current[index] = value;
    side === "a" ? setA(current) : setB(current);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="team-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">DOPPIO</p><h2>Componi le squadre</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>

        <p className="modal-match">
          {match?.round || "Match"} · scrivi liberamente i nomi oppure scegli un giocatore già registrato.
        </p>

        <div className="team-form-grid">
          <div className="team-box black-box">
            <span>SQUADRA A</span>
            <PlayerAutocomplete
              value={a[0]}
              onChange={v => setPlayer("a", 0, v)}
              players={players}
              excluded={allSelected.filter((_, i) => i !== 0)}
              placeholder="Giocatore 1"
            />
            <PlayerAutocomplete
              value={a[1]}
              onChange={v => setPlayer("a", 1, v)}
              players={players}
              excluded={allSelected.filter((_, i) => i !== 1)}
              placeholder="Giocatore 2"
            />
          </div>

          <div className="versus">VS</div>

          <div className="team-box yellow-box">
            <span>SQUADRA B</span>
            <PlayerAutocomplete
              value={b[0]}
              onChange={v => setPlayer("b", 0, v)}
              players={players}
              excluded={allSelected.filter((_, i) => i !== 2)}
              placeholder="Giocatore 1"
            />
            <PlayerAutocomplete
              value={b[1]}
              onChange={v => setPlayer("b", 1, v)}
              players={players}
              excluded={allSelected.filter((_, i) => i !== 3)}
              placeholder="Giocatore 2"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn yellow" onClick={onRandom}>
            <Shuffle size={17}/> Genera equilibrate
          </button>
          <button className="btn black" onClick={() => onSave(a, b)}>
            <Check size={17}/> Salva squadre
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
