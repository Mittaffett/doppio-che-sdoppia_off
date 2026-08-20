import React, { useState, useMemo, useEffect, useRef } from "react";

const STORAGE_KEY = "torneo-tennis-stato";

/* ---------- design tokens ---------- */
const C = {
  courtDeep: "#0F2A20",
  court: "#173B2C",
  courtLine: "#F5F3EE",
  purple: "#5B2C6F",
  purpleDeep: "#3E1D4C",
  ball: "#CFE04A",
  clay: "#B84B2C",
  ink: "#0C1712",
  chalk: "#F5F3EE",
  chalkDim: "#C9D6CC",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');`;

/* ---------- helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 10);
const nextPow2 = (n) => Math.max(2, Math.pow(2, Math.ceil(Math.log2(Math.max(n, 1)))));

function roundLabel(roundsFromEnd, totalParticipants) {
  const labels = ["Finale", "Semifinale", "Quarti di finale", "Ottavi di finale"];
  if (roundsFromEnd < labels.length) return labels[roundsFromEnd];
  return `Turno preliminare`;
}

function buildBracket(entrants) {
  // entrants: array of {id,label} possibly containing null (BYE)
  const size = entrants.length;
  const totalRounds = Math.log2(size);
  const rounds = [];

  let current = [];
  for (let i = 0; i < size; i += 2) {
    current.push({
      id: uid(),
      round: 0,
      a: entrants[i],
      b: entrants[i + 1],
      sets: [],
      winner: null,
      time: "",
      court: "",
    });
  }
  rounds.push(current);

  for (let r = 1; r < totalRounds; r++) {
    const prev = rounds[r - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push({
        id: uid(),
        round: r,
        a: null,
        b: null,
        sets: [],
        winner: null,
        time: "",
        court: "",
        fromA: prev[i].id,
        fromB: prev[i + 1] ? prev[i + 1].id : null,
      });
    }
    rounds.push(next);
  }

  // resolve byes immediately, cascading upward
  const resolveByes = (rounds) => {
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < rounds.length; r++) {
        for (const m of rounds[r]) {
          if (!m.winner && m.a && !m.b) {
            m.winner = m.a;
            changed = true;
          } else if (!m.winner && m.b && !m.a) {
            m.winner = m.b;
            changed = true;
          }
          if (m.winner && r + 1 < rounds.length) {
            const nextRound = rounds[r + 1];
            const target = nextRound.find((nm) => nm.fromA === m.id || nm.fromB === m.id);
            if (target) {
              if (target.fromA === m.id && !target.a) {
                target.a = m.winner;
                changed = true;
              } else if (target.fromB === m.id && !target.b) {
                target.b = m.winner;
                changed = true;
              }
            }
          }
        }
      }
    }
    return rounds;
  };

  return resolveByes(rounds);
}

function setsWon(sets) {
  let a = 0,
    b = 0;
  for (const s of sets) {
    if (s[0] === "" || s[1] === "" || s[0] == null || s[1] == null) continue;
    const av = Number(s[0]),
      bv = Number(s[1]);
    if (Number.isNaN(av) || Number.isNaN(bv)) continue;
    if (av > bv) a++;
    else if (bv > av) b++;
  }
  return { a, b };
}

/* ---------- app ---------- */
export default function TennisTournamentApp() {
  const [tab, setTab] = useState("iscritti");
  const [mode, setMode] = useState("singolare"); // singolare | doppio
  const [tournamentName, setTournamentName] = useState("Torneo Sociale");
  const [participants, setParticipants] = useState([]); // singolare: players, doppio: players {id,label,level}
  const [doubleTeams, setDoubleTeams] = useState([]); // {id,p1,p2,label}
  const [rounds, setRounds] = useState(null);

  // form state
  const [singleName, setSingleName] = useState("");
  const [doublePlayerName, setDoublePlayerName] = useState("");
  const [doublePlayerLevel, setDoublePlayerLevel] = useState("basso");

  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const hydrating = useRef(true);

  // load persisted state on mount
  useEffect(() => {
    (async () => {
      try {
        const value = localStorage.getItem(STORAGE_KEY);
        if (value) {
          const data = JSON.parse(value);
          if (data.tournamentName) setTournamentName(data.tournamentName);
          if (data.mode) setMode(data.mode);
          if (data.participants) setParticipants(data.participants);
          if (data.doubleTeams) setDoubleTeams(data.doubleTeams);
          if (data.rounds) setRounds(data.rounds);
        }
      } catch (e) {
        // no saved data yet, or read failed — start fresh
      } finally {
        hydrating.current = false;
        setLoaded(true);
      }
    })();
  }, []);

  // persist on any relevant change (skip the initial hydration write)
  useEffect(() => {
    if (hydrating.current) return;
    (async () => {
      try {
        const payload = JSON.stringify({ tournamentName, mode, participants, doubleTeams, rounds });
        localStorage.setItem(STORAGE_KEY, payload);
        setSaveError(false);
      } catch (e) {
        setSaveError(true);
      }
    })();
  }, [tournamentName, mode, participants, doubleTeams, rounds]);

  const clearSavedData = async () => {
    if (!window.confirm("Cancellare tutti i dati salvati del torneo? L'azione non è reversibile.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
    setTournamentName("Torneo Sociale");
    setMode("singolare");
    setParticipants([]);
    setDoubleTeams([]);
    setRounds(null);
    setTab("iscritti");
  };

  const addSingle = () => {
    const name = singleName.trim();
    if (!name) return;
    setParticipants((p) => [...p, { id: uid(), label: name }]);
    setSingleName("");
  };

  const addDoublePlayer = () => {
    const name = doublePlayerName.trim();
    if (!name) return;
    setParticipants((p) => [...p, { id: uid(), label: name, level: doublePlayerLevel }]);
    setDoublePlayerName("");
  };

  const removeParticipant = (id) => {
    setParticipants((p) => p.filter((x) => x.id !== id));
    setDoubleTeams((teams) =>
      teams.map((t) => ({
        ...t,
        p1: t.p1 === id ? "" : t.p1,
        p2: t.p2 === id ? "" : t.p2,
      }))
    );
  };

  const createEmptyDoubleTeams = () => {
    const count = Math.floor(participants.length / 2);
    setDoubleTeams(
      Array.from({ length: count }, (_, i) => ({
        id: uid(),
        p1: "",
        p2: "",
        label: "",
      }))
    );
  };

  const makeRandomDoubleTeams = () => {
    if (participants.length < 4) return;
    const players = [...participants];
    const high = players.filter((p) => p.level === "alto");
    const low = players.filter((p) => p.level === "basso");
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const h = shuffle(high);
    const l = shuffle(low);
    const pairs = [];
    while (h.length && l.length) pairs.push([h.pop().id, l.pop().id]);

    const remaining = shuffle([...h, ...l].map((p) => (typeof p === "string" ? p : p.id)));
    while (remaining.length >= 2) pairs.push([remaining.pop(), remaining.pop()]);

    // If an odd player remains, leave them out of the team draw and show it clearly.
    setDoubleTeams(
      pairs.map(([p1id, p2id]) => ({
        id: uid(),
        p1: p1id,
        p2: p2id,
        label: "",
      }))
    );
  };

  const updateDoubleTeam = (teamId, patch) => {
    setDoubleTeams((teams) => teams.map((t) => (t.id === teamId ? { ...t, ...patch } : t)));
  };

  const teamFromSlot = (slot) => {
    const a = participants.find((p) => p.id === slot.p1);
    const b = participants.find((p) => p.id === slot.p2);
    if (!a || !b) return null;
    return {
      id: slot.id,
      label: slot.label.trim() || `${a.label} / ${b.label}`,
      players: [a, b],
    };
  };

  const generateBracket = () => {
    const entrantsSource =
      mode === "doppio" ? doubleTeams.map(teamFromSlot).filter(Boolean) : participants;

    if (entrantsSource.length < 2) return;
    if (mode === "doppio" && entrantsSource.length !== doubleTeams.length) return;

    const size = nextPow2(entrantsSource.length);
    const entrants = [...entrantsSource];
    while (entrants.length < size) entrants.push(null);
    for (let i = entrants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entrants[i], entrants[j]] = [entrants[j], entrants[i]];
    }
    const built = buildBracket(entrants);
    setRounds(built);
    setTab("tabellone");
  };

  const resetTournament = () => {
    setRounds(null);
    setTab("iscritti");
  };

  const updateMatch = (roundIdx, matchId, patch) => {
    setRounds((prev) => {
      const copy = prev.map((r) => r.map((m) => ({ ...m })));
      const m = copy[roundIdx].find((x) => x.id === matchId);
      Object.assign(m, patch);

      // recompute winner from sets
      if (patch.sets) {
        const { a, b } = setsWon(patch.sets);
        if (m.a && m.b) {
          if (a >= 2) m.winner = m.a;
          else if (b >= 2) m.winner = m.b;
          else m.winner = null;
        }
      }

      // propagate winner forward, clearing stale advancement if winner changes
      for (let r = roundIdx; r < copy.length - 1; r++) {
        for (const match of copy[r]) {
          if (!match.winner) continue;
          const target = copy[r + 1].find((nm) => nm.fromA === match.id || nm.fromB === match.id);
          if (!target) continue;
          if (target.fromA === match.id) target.a = match.winner;
          if (target.fromB === match.id) target.b = match.winner;
        }
      }
      return copy;
    });
  };

  const allMatches = useMemo(() => {
    if (!rounds) return [];
    return rounds.flatMap((r, ri) =>
      r.map((m) => ({ ...m, roundIdx: ri, roundName: roundLabel(rounds.length - 1 - ri) }))
    );
  }, [rounds]);

  if (!loaded) {
    return (
      <div style={{ ...styles.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", color: C.chalkDim, fontSize: 13 }}>
          Caricamento torneo salvato…
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        .tt-scroll::-webkit-scrollbar { height: 10px; }
        .tt-scroll::-webkit-scrollbar-thumb { background: ${C.purple}; border-radius: 6px; }
        input[type="text"], input[type="number"], input[type="time"] {
          font-family: 'Inter', sans-serif;
        }
        .tt-btn:focus-visible, .tt-tab:focus-visible, input:focus-visible {
          outline: 2px solid ${C.ball};
          outline-offset: 2px;
        }
        @media (max-width: 700px) { .teamSlot { grid-template-columns: 1fr; } }\n        @media (prefers-reduced-motion: reduce) {
          .tt-fade { animation: none !important; }
        }
        @keyframes ttFade { from { opacity: 0; transform: translateY(4px);} to { opacity:1; transform:none; } }
        .tt-fade { animation: ttFade .35s ease; }
      `}</style>

      <header style={styles.header}>
        <div style={styles.headerLines} aria-hidden="true" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={styles.eyebrow}>GESTIONE TORNEO</div>
          <input
            aria-label="Nome del torneo"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            style={styles.titleInput}
          />
        </div>
      </header>

      <nav style={styles.tabs}>
        {[
          { key: "iscritti", label: "Iscritti" },
          { key: "tabellone", label: "Tabellone" },
          { key: "programma", label: "Programma" },
        ].map((t) => (
          <button
            key={t.key}
            className="tt-tab"
            onClick={() => setTab(t.key)}
            style={{
              ...styles.tab,
              ...(tab === t.key ? styles.tabActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={styles.main} className="tt-fade">
        {tab === "iscritti" && (
          <IscrittiTab
            mode={mode}
            setMode={setMode}
            hasBracket={!!rounds}
            participants={participants}
            singleName={singleName}
            setSingleName={setSingleName}
            addSingle={addSingle}
            doublePlayerName={doublePlayerName}
            setDoublePlayerName={setDoublePlayerName}
            doublePlayerLevel={doublePlayerLevel}
            setDoublePlayerLevel={setDoublePlayerLevel}
            addDoublePlayer={addDoublePlayer}
            doubleTeams={doubleTeams}
            createEmptyDoubleTeams={createEmptyDoubleTeams}
            makeRandomDoubleTeams={makeRandomDoubleTeams}
            updateDoubleTeam={updateDoubleTeam}
            removeParticipant={removeParticipant}
            generateBracket={generateBracket}
            resetTournament={resetTournament}
            clearSavedData={clearSavedData}
          />
        )}
        {saveError && (
          <div style={styles.saveErrorNotice}>
            Attenzione: il salvataggio automatico non è riuscito. I dati restano visibili in questa sessione ma
            potrebbero non essere recuperati alla riapertura.
          </div>
        )}
        {tab === "tabellone" &&
          (rounds ? (
            <Tabellone rounds={rounds} updateMatch={updateMatch} />
          ) : (
            <EmptyState text="Nessun tabellone ancora. Aggiungi gli iscritti e genera il tabellone." />
          ))}
        {tab === "programma" &&
          (rounds ? (
            <Programma matches={allMatches} updateMatch={updateMatch} />
          ) : (
            <EmptyState text="Il programma comparirà qui dopo aver generato il tabellone." />
          ))}
      </main>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function EmptyState({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

function IscrittiTab(props) {
  const {
    mode,
    setMode,
    hasBracket,
    participants,
    singleName,
    setSingleName,
    addSingle,
    doublePlayerName,
    setDoublePlayerName,
    doublePlayerLevel,
    setDoublePlayerLevel,
    addDoublePlayer,
    doubleTeams,
    createEmptyDoubleTeams,
    makeRandomDoubleTeams,
    updateDoubleTeam,
    removeParticipant,
    generateBracket,
    resetTournament,
    clearSavedData,
  } = props;

  const assigned = new Set(
    doubleTeams.flatMap((t) => [t.p1, t.p2]).filter(Boolean)
  );
  const unassigned = participants.filter((p) => !assigned.has(p.id));

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.cardLabel}>Formato</div>
        <div style={{ display: "flex", gap: 10 }}>
          {["singolare", "doppio"].map((m) => (
            <button
              key={m}
              className="tt-btn"
              disabled={hasBracket}
              onClick={() => setMode(m)}
              style={{
                ...styles.pill,
                ...(mode === m ? styles.pillActive : {}),
                opacity: hasBracket ? 0.5 : 1,
                cursor: hasBracket ? "not-allowed" : "pointer",
              }}
            >
              {m === "singolare" ? "Singolare" : "Doppio"}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardLabel}>
          {mode === "singolare" ? "Aggiungi giocatore" : "Aggiungi giocatore al doppio"}
        </div>

        {mode === "singolare" ? (
          <div style={styles.formRow}>
            <input
              style={styles.input}
              placeholder="Nome e cognome"
              value={singleName}
              onChange={(e) => setSingleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSingle()}
            />
            <button className="tt-btn" style={styles.addBtn} onClick={addSingle}>Aggiungi</button>
          </div>
        ) : (
          <div>
            <div style={styles.formRow}>
              <input
                style={styles.input}
                placeholder="Nome e cognome"
                value={doublePlayerName}
                onChange={(e) => setDoublePlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDoublePlayer()}
              />
              <select
                style={styles.input}
                value={doublePlayerLevel}
                onChange={(e) => setDoublePlayerLevel(e.target.value)}
              >
                <option value="alto">Livello alto</option>
                <option value="basso">Livello basso</option>
              </select>
              <button className="tt-btn" style={styles.addBtn} onClick={addDoublePlayer}>Aggiungi</button>
            </div>
            <div style={styles.hint}>
              Nel sorteggio casuale il sistema cerca di abbinare, quando possibile, un giocatore di livello alto con uno di livello basso.
            </div>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardLabel}>
          {mode === "singolare" ? "Giocatori iscritti" : "Giocatori iscritti"} ({participants.length})
        </div>
        {participants.length === 0 ? (
          <div style={styles.mutedText}>Nessun iscritto ancora.</div>
        ) : (
          <ul style={styles.list}>
            {participants.map((p, i) => (
              <li key={p.id} style={styles.listItem}>
                <span style={styles.listIndex}>{String(i + 1).padStart(2, "0")}</span>
                <span style={styles.listLabel}>
                  {p.label}
                  {mode === "doppio" && p.level && (
                    <span style={styles.levelBadge}>{p.level === "alto" ? "ALTO" : "BASSO"}</span>
                  )}
                </span>
                {!hasBracket && (
                  <button className="tt-btn" onClick={() => removeParticipant(p.id)} style={styles.removeBtn}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {mode === "doppio" && !hasBracket && (
        <div style={styles.card}>
          <div style={styles.cardLabel}>Composizione squadre</div>

          {participants.length < 4 ? (
            <div style={styles.mutedText}>
              Per creare un torneo di doppio servono almeno 4 giocatori.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <button className="tt-btn" style={styles.primaryBtn} onClick={makeRandomDoubleTeams}>
                  🎲 Crea squadre casualmente
                </button>
                <button className="tt-btn" style={styles.secondaryBtn} onClick={createEmptyDoubleTeams}>
                  ✎ Crea squadre manualmente
                </button>
              </div>

              <div style={styles.hint}>
                Il metodo casuale privilegia gli abbinamenti <b>ALTO + BASSO</b> quando disponibili.
                Con un numero dispari di giocatori, l'ultimo giocatore non viene inserito nel torneo.
              </div>

              {doubleTeams.length > 0 && (
                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  {doubleTeams.map((team, index) => (
                    <div key={team.id} style={styles.teamSlot}>
                      <div style={styles.teamSlotTitle}>SQUADRA {index + 1}</div>

                      <select
                        style={styles.input}
                        value={team.p1}
                        onChange={(e) => updateDoubleTeam(team.id, { p1: e.target.value })}
                      >
                        <option value="">Giocatore 1…</option>
                        {participants
                          .filter((p) => p.id === team.p1 || !assigned.has(p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>{p.label} · {p.level === "alto" ? "alto" : "basso"}</option>
                          ))}
                      </select>

                      <select
                        style={styles.input}
                        value={team.p2}
                        onChange={(e) => updateDoubleTeam(team.id, { p2: e.target.value })}
                      >
                        <option value="">Giocatore 2…</option>
                        {participants
                          .filter((p) => p.id === team.p2 || !assigned.has(p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>{p.label} · {p.level === "alto" ? "alto" : "basso"}</option>
                          ))}
                      </select>

                      <input
                        style={styles.input}
                        placeholder="Nome squadra (opzionale)"
                        value={team.label}
                        onChange={(e) => updateDoubleTeam(team.id, { label: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}

              {unassigned.length > 0 && doubleTeams.length > 0 && (
                <div style={styles.hint}>
                  Non ancora assegnati: {unassigned.map((p) => p.label).join(", ")}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {!hasBracket ? (
          <button
            className="tt-btn"
            style={{
              ...styles.primaryBtn,
              opacity: (mode === "doppio" ? doubleTeams.filter((t) => t.p1 && t.p2).length : participants.length) < 2 ? 0.5 : 1,
              cursor: "pointer",
            }}
            disabled={
              mode === "doppio"
                ? doubleTeams.length < 2 || doubleTeams.some((t) => !t.p1 || !t.p2)
                : participants.length < 2
            }
            onClick={generateBracket}
          >
            Genera tabellone →
          </button>
        ) : (
          <button className="tt-btn" style={styles.dangerBtn} onClick={resetTournament}>
            Ricomincia torneo
          </button>
        )}
      </div>

      {mode === "singolare" && participants.length >= 2 && !hasBracket &&
        (participants.length & (participants.length - 1)) !== 0 && (
        <div style={styles.hint}>
          Con {participants.length} iscritti, {nextPow2(participants.length) - participants.length}{" "}
          {nextPow2(participants.length) - participants.length === 1 ? "posizione" : "posizioni"} del
          tabellone saranno un turno di riposo (bye).
        </div>
      )}

      {mode === "doppio" && doubleTeams.length >= 2 && !hasBracket &&
        (doubleTeams.length & (doubleTeams.length - 1)) !== 0 && (
        <div style={styles.hint}>
          Con {doubleTeams.length} squadre, {nextPow2(doubleTeams.length) - doubleTeams.length}{" "}
          {nextPow2(doubleTeams.length) - doubleTeams.length === 1 ? "posizione" : "posizioni"} del tabellone saranno un turno di riposo (bye).
        </div>
      )}

      <div style={styles.clearDataRow}>
        <button className="tt-btn" onClick={clearSavedData} style={styles.clearDataBtn}>
          Cancella dati salvati del torneo
        </button>
        <span style={styles.clearDataHint}>
          I dati sono salvati automaticamente solo per te, su questo account.
        </span>
      </div>
    </div>
  );
}

function participantName(p) {
  return p ? p.label : null;
}

function MatchCard({ m, onOpen }) {
  const aName = participantName(m.a);
  const bName = participantName(m.b);
  const { a: aSets, b: bSets } = setsWon(m.sets);
  const pending = !aName || !bName;

  return (
    <button
      className="tt-btn"
      onClick={() => !pending && onOpen(m)}
      style={{ ...styles.matchCard, cursor: pending ? "default" : "pointer" }}
    >
      <div style={styles.matchMeta}>
        {m.time || m.court ? (
          <span>
            {m.time && <span style={styles.mono}>{m.time}</span>}
            {m.time && m.court ? " · " : ""}
            {m.court && <span>{m.court}</span>}
          </span>
        ) : (
          <span style={{ opacity: 0.5 }}>orario da definire</span>
        )}
      </div>
      <PlayerRow name={aName} sets={m.sets} side={0} won={m.winner && m.winner === m.a} setsWonCount={aSets} />
      <div style={styles.matchDivider} />
      <PlayerRow name={bName} sets={m.sets} side={1} won={m.winner && m.winner === m.b} setsWonCount={bSets} />
    </button>
  );
}

function PlayerRow({ name, sets, side, won, setsWonCount }) {
  return (
    <div style={{ ...styles.playerRow, opacity: name ? 1 : 0.4 }}>
      <span style={{ ...styles.playerName, fontWeight: won ? 700 : 500 }}>
        {name || "—"}
        {won && <span style={styles.winnerDot} aria-label="vincitore" />}
      </span>
      <span style={styles.setScores}>
        {sets.length > 0 &&
          sets.map((s, i) => (
            <span key={i} style={styles.mono}>
              {s[side] === "" || s[side] == null ? "-" : s[side]}
            </span>
          ))}
        {setsWonCount > 0 && <span style={styles.setsBadge}>{setsWonCount}</span>}
      </span>
    </div>
  );
}

function Tabellone({ rounds, updateMatch }) {
  const [openMatch, setOpenMatch] = useState(null); // {roundIdx, matchId}

  const openEditor = (m) => setOpenMatch({ roundIdx: m.round, matchId: m.id });
  const activeMatch = openMatch
    ? rounds[openMatch.roundIdx].find((m) => m.id === openMatch.matchId)
    : null;

  return (
    <div>
      <div className="tt-scroll" style={styles.bracketScroll}>
        <div style={styles.bracketRow}>
          {rounds.map((round, ri) => (
            <div key={ri} style={styles.roundCol}>
              <div style={styles.roundTitle}>{roundLabel(rounds.length - 1 - ri)}</div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-around",
                  height: "100%",
                  gap: 18,
                }}
              >
                {round.map((m) => (
                  <div key={m.id} style={styles.matchWrap}>
                    <MatchCard m={m} onOpen={openEditor} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeMatch && (
        <ScoreEditor
          match={activeMatch}
          onClose={() => setOpenMatch(null)}
          onSave={(patch) => {
            updateMatch(activeMatch.round, activeMatch.id, patch);
          }}
        />
      )}
    </div>
  );
}

function ScoreEditor({ match, onClose, onSave }) {
  const [sets, setSets] = useState(
    match.sets.length ? match.sets.map((s) => [...s]) : [["", ""], ["", ""], ["", ""]]
  );
  const [time, setTime] = useState(match.time);
  const [court, setCourt] = useState(match.court);

  const setVal = (i, side, val) => {
    const clean = val.replace(/[^0-9]/g, "").slice(0, 1);
    setSets((prev) => {
      const copy = prev.map((s) => [...s]);
      copy[i][side] = clean;
      return copy;
    });
  };

  const { a, b } = setsWon(sets);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.cardLabel}>Risultato partita</div>
          <button className="tt-btn" onClick={onClose} style={styles.closeBtn} aria-label="Chiudi">
            ✕
          </button>
        </div>

        <div style={styles.formRow}>
          <input
            style={styles.input}
            placeholder="Orario (es. 10:30)"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Campo (es. Campo 2)"
            value={court}
            onChange={(e) => setCourt(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={styles.setsHeaderRow}>
            <span style={{ flex: 1 }}>{match.a?.label}</span>
            {sets.map((_, i) => (
              <span key={i} style={styles.setColHeader}>
                Set {i + 1}
              </span>
            ))}
            <span style={styles.mono}>{a}</span>
          </div>
          <ScoreLine sets={sets} side={0} onChange={setVal} />
          <div style={styles.setsHeaderRow}>
            <span style={{ flex: 1 }}>{match.b?.label}</span>
            {sets.map((_, i) => (
              <span key={i} style={styles.setColHeader}></span>
            ))}
            <span style={styles.mono}>{b}</span>
          </div>
          <ScoreLine sets={sets} side={1} onChange={setVal} />
        </div>

        <button
          className="tt-btn"
          style={{ ...styles.primaryBtn, marginTop: 20, width: "100%" }}
          onClick={() => {
            onSave({ sets, time, court });
            onClose();
          }}
        >
          Salva risultato
        </button>
      </div>
    </div>
  );
}

function ScoreLine({ sets, side, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ flex: 1 }} />
      {sets.map((s, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          value={s[side]}
          onChange={(e) => onChange(i, side, e.target.value)}
          style={styles.scoreInput}
        />
      ))}
      <span style={{ width: 20 }} />
    </div>
  );
}

function Programma({ matches, updateMatch }) {
  const playable = matches.filter((m) => m.a && m.b);
  const sorted = [...playable].sort((x, y) => (x.time || "~").localeCompare(y.time || "~"));

  if (playable.length === 0) return <EmptyState text="Nessuna partita disponibile ancora." />;

  return (
    <div>
      {sorted.map((m) => (
        <div key={m.id} style={styles.scheduleRow}>
          <div style={styles.scheduleRound}>{m.roundName}</div>
          <div style={{ flex: 1 }}>
            <div style={styles.scheduleMatchup}>
              {m.a.label} <span style={{ opacity: 0.5 }}>vs</span> {m.b.label}
            </div>
            {m.winner && (
              <div style={styles.scheduleWinner}>Vince: {m.winner.label}</div>
            )}
          </div>
          <div style={styles.scheduleFields}>
            <input
              style={styles.scheduleInput}
              placeholder="Orario"
              value={m.time}
              onChange={(e) => updateMatch(m.roundIdx, m.id, { sets: m.sets, time: e.target.value, court: m.court })}
            />
            <input
              style={styles.scheduleInput}
              placeholder="Campo"
              value={m.court}
              onChange={(e) => updateMatch(m.roundIdx, m.id, { sets: m.sets, time: m.time, court: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- styles ---------- */
const styles = {
  app: {
    minHeight: "100%",
    background: `linear-gradient(180deg, ${C.courtDeep}, ${C.court})`,
    color: C.chalk,
    fontFamily: "'Inter', sans-serif",
    paddingBottom: 40,
  },
  header: {
    position: "relative",
    padding: "28px 24px 22px",
    background: `linear-gradient(135deg, ${C.purpleDeep}, ${C.purple})`,
    overflow: "hidden",
  },
  headerLines: {
    position: "absolute",
    inset: 0,
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0 38px, rgba(245,243,238,0.06) 38px 40px)`,
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    letterSpacing: "0.18em",
    color: C.ball,
    marginBottom: 6,
    fontWeight: 700,
  },
  titleInput: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "clamp(32px, 7vw, 48px)",
    letterSpacing: "0.02em",
    color: C.chalk,
    background: "transparent",
    border: "none",
    borderBottom: "2px solid rgba(245,243,238,0.25)",
    padding: "2px 0",
    width: "100%",
    maxWidth: 520,
  },
  tabs: {
    display: "flex",
    gap: 4,
    padding: "14px 20px 0",
  },
  tab: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    letterSpacing: "0.06em",
    color: C.chalkDim,
    background: "transparent",
    border: "none",
    borderBottom: "3px solid transparent",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  tabActive: {
    color: C.ball,
    borderBottom: `3px solid ${C.ball}`,
  },
  main: {
    padding: "20px 20px 10px",
    maxWidth: 1100,
    margin: "0 auto",
  },
  card: {
    background: "rgba(245,243,238,0.04)",
    border: "1px solid rgba(245,243,238,0.12)",
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
  },
  cardLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    letterSpacing: "0.1em",
    color: C.ball,
    marginBottom: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  formRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  input: {
    flex: "1 1 160px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(245,243,238,0.2)",
    borderRadius: 6,
    padding: "10px 12px",
    color: C.chalk,
    fontSize: 14,
  },
  addBtn: {
    background: C.ball,
    color: C.ink,
    border: "none",
    borderRadius: 6,
    padding: "10px 18px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
  secondaryBtn: {
    background: "transparent",
    color: C.chalk,
    border: `1px solid rgba(245,243,238,0.25)`,
    borderRadius: 8,
    padding: "13px 22px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  levelBadge: {
    display: "inline-block",
    marginLeft: 8,
    padding: "2px 6px",
    borderRadius: 999,
    fontSize: 9,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.06em",
    background: "rgba(207,224,74,0.15)",
    color: C.ball,
    verticalAlign: "middle",
  },
  teamSlot: {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 0.8fr) minmax(120px, 1fr) minmax(120px, 1fr)",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    border: "1px solid rgba(245,243,238,0.12)",
    background: "rgba(255,255,255,0.025)",
  },
  teamSlotTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: C.ball,
    fontWeight: 700,
  },
  primaryBtn: {
    background: C.ball,
    color: C.ink,
    border: "none",
    borderRadius: 8,
    padding: "13px 22px",
    fontWeight: 700,
    fontSize: 15,
    fontFamily: "'Inter', sans-serif",
  },
  dangerBtn: {
    background: "transparent",
    color: C.chalkDim,
    border: `1px solid rgba(245,243,238,0.25)`,
    borderRadius: 8,
    padding: "13px 22px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  pill: {
    background: "rgba(255,255,255,0.06)",
    color: C.chalkDim,
    border: "1px solid rgba(245,243,238,0.2)",
    borderRadius: 999,
    padding: "8px 18px",
    fontWeight: 600,
    fontSize: 14,
  },
  pillActive: {
    background: C.purple,
    color: C.chalk,
    borderColor: C.purple,
  },
  list: { listStyle: "none", margin: 0, padding: 0 },
  listItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "9px 4px",
    borderBottom: "1px solid rgba(245,243,238,0.08)",
  },
  listIndex: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: C.ball,
    width: 22,
  },
  listLabel: { flex: 1, fontSize: 14.5 },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: C.chalkDim,
    cursor: "pointer",
    fontSize: 13,
    padding: 4,
  },
  mutedText: { color: C.chalkDim, fontSize: 14 },
  hint: {
    fontSize: 12.5,
    color: C.chalkDim,
    marginTop: 10,
    fontStyle: "italic",
  },
  empty: {
    padding: "60px 20px",
    textAlign: "center",
    color: C.chalkDim,
    fontSize: 15,
  },
  bracketScroll: {
    overflowX: "auto",
    paddingBottom: 12,
  },
  bracketRow: {
    display: "flex",
    gap: 32,
    minWidth: "fit-content",
  },
  roundCol: {
    minWidth: 220,
    display: "flex",
    flexDirection: "column",
  },
  roundTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11.5,
    letterSpacing: "0.1em",
    color: C.ball,
    textTransform: "uppercase",
    marginBottom: 14,
    fontWeight: 700,
  },
  matchWrap: { position: "relative" },
  matchCard: {
    width: "100%",
    textAlign: "left",
    background: "rgba(245,243,238,0.05)",
    border: `1px solid rgba(245,243,238,0.16)`,
    borderRadius: 8,
    padding: "10px 12px",
    color: C.chalk,
  },
  matchMeta: {
    fontSize: 11,
    color: C.chalkDim,
    marginBottom: 6,
  },
  playerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "3px 0",
  },
  playerName: { fontSize: 13.5 },
  winnerDot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: C.ball,
    marginLeft: 7,
  },
  setScores: { display: "flex", gap: 6, alignItems: "center" },
  setsBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    background: "rgba(207,224,74,0.18)",
    color: C.ball,
    borderRadius: 4,
    padding: "1px 6px",
    marginLeft: 4,
  },
  matchDivider: {
    height: 1,
    background: "rgba(245,243,238,0.1)",
    margin: "4px 0",
  },
  mono: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(12,23,18,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  modal: {
    background: C.court,
    border: `1px solid rgba(245,243,238,0.2)`,
    borderRadius: 12,
    padding: 22,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: C.chalkDim,
    fontSize: 16,
    cursor: "pointer",
  },
  setsHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: C.chalkDim,
  },
  setColHeader: {
    width: 40,
    textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10.5,
  },
  scoreInput: {
    width: 40,
    textAlign: "center",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(245,243,238,0.25)",
    borderRadius: 5,
    padding: "6px 0",
    color: C.chalk,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 15,
  },
  scheduleRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 4px",
    borderBottom: "1px solid rgba(245,243,238,0.08)",
    flexWrap: "wrap",
  },
  scheduleRound: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10.5,
    color: C.ball,
    textTransform: "uppercase",
    width: 130,
  },
  scheduleMatchup: { fontSize: 14.5 },
  scheduleWinner: { fontSize: 12, color: C.chalkDim, marginTop: 2 },
  scheduleFields: { display: "flex", gap: 8 },
  scheduleInput: {
    width: 110,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(245,243,238,0.2)",
    borderRadius: 6,
    padding: "7px 9px",
    color: C.chalk,
    fontSize: 13,
  },
  saveErrorNotice: {
    background: "rgba(184,75,44,0.15)",
    border: `1px solid ${C.clay}`,
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: C.chalk,
    marginBottom: 14,
  },
  clearDataRow: {
    marginTop: 22,
    paddingTop: 16,
    borderTop: "1px solid rgba(245,243,238,0.1)",
  },
  clearDataBtn: {
    background: "transparent",
    color: C.chalkDim,
    border: "1px solid rgba(245,243,238,0.2)",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 13,
    cursor: "pointer",
  },
  clearDataHint: {
    display: "block",
    fontSize: 12,
    color: C.chalkDim,
    marginTop: 8,
    fontStyle: "italic",
  },
};