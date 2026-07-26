import { useMemo, useState } from "react";
import { Plus, Trash2, Search, XCircle, DownloadCloud, CalendarPlus, FileText, Mic, CloudOff, RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn, Pill } from "@/components/common";
import { useSujetsArchive } from "@/hooks/useSujetsArchive";
import { saveMonth, deleteMonth, seedFromShipped, monthLabel, MONTH_LABELS, SECTION_LABEL } from "@/services/sujetsArchiveService";

const YEAR_NOW = new Date().getFullYear();
const YEAR_CHOICES = Array.from({ length: 8 }, (_, i) => YEAR_NOW + 1 - i); // next year → 6 years back
const countEO = (data) => data.reduce((a, t) => a + t.parties.reduce((b, p) => b + p.sujets.length, 0), 0);

// Admin manager for the monthly subjects archive (Expression écrite / orale),
// backed by sujets_archive (DB). No in-place editing by request — only add,
// remove and filter. EE entries are 3-task combinaisons; EO entries are sujets
// grouped by tâche (2/3) → partie.
export function SujetsManager() {
  const { c, notify } = useApp();
  const [section, setSection] = useState("ee");
  const { loading, years, source, reload } = useSujetsArchive(section);
  const [year, setYear] = useState(null);
  const [mkey, setMkey] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const inp = `px-3 py-2 rounded-xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const yearObj = years.find((y) => y.year === year) || years[0] || null;
  const monthObj = yearObj?.months.find((m) => m.key === mkey) || yearObj?.months[0] || null;

  const run = async (fn, okMsg) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r?.ok) return notify(r?.error ? `Échec : ${r.error}` : "Action refusée. Migration sujets_archive appliquée et compte admin ?");
    if (okMsg) notify(okMsg);
    reload();
    return r;
  };

  const seed = () => run(() => seedFromShipped(section), null).then((r) => r?.ok && notify(r.count ? `${r.count} mois importés depuis les données par défaut.` : "Tout est déjà présent — rien à importer."));

  const addMonth = (y, mn) => run(() => saveMonth(section, y, mn, []), `${monthLabel(mn)} ${y} ajouté.`).then(() => { setYear(y); setMkey(`${y}-${String(mn).padStart(2, "0")}`); });
  const removeMonth = (m) => run(() => deleteMonth(section, yearObj.year, m.monthNum), `${m.month} ${yearObj.year} supprimé.`);

  // EE: append / remove a combinaison in the selected month.
  const addCombinaison = (payload) => {
    const n = (monthObj.data.reduce((mx, s) => Math.max(mx, s.n || 0), 0) || 0) + 1;
    return run(() => saveMonth(section, yearObj.year, monthObj.monthNum, [...monthObj.data, { n, ...payload }]), `Combinaison ${n} ajoutée.`);
  };
  const removeCombinaison = (i) => run(() => saveMonth(section, yearObj.year, monthObj.monthNum, monthObj.data.filter((_, j) => j !== i)), "Combinaison supprimée.");

  // EO: append / remove a sujet within a tâche → partie of the selected month.
  const addSujet = ({ tache, partie, text }) => {
    const data = JSON.parse(JSON.stringify(monthObj.data));
    let t = data.find((x) => x.tache === tache);
    if (!t) { t = { tache, parties: [] }; data.push(t); }
    let p = t.parties.find((x) => x.partie === partie);
    if (!p) { p = { partie, sujets: [] }; t.parties.push(p); }
    p.sujets.push(text);
    t.parties.sort((a, b) => a.partie - b.partie);
    data.sort((a, b) => a.tache - b.tache);
    return run(() => saveMonth(section, yearObj.year, monthObj.monthNum, data), "Sujet ajouté.");
  };
  const removeSujet = (tache, partie, si) => {
    const data = JSON.parse(JSON.stringify(monthObj.data));
    const t = data.find((x) => x.tache === tache);
    const p = t?.parties.find((x) => x.partie === partie);
    if (p) { p.sujets.splice(si, 1); if (!p.sujets.length) t.parties = t.parties.filter((x) => x !== p); }
    return run(() => saveMonth(section, yearObj.year, monthObj.monthNum, data), "Sujet supprimé.");
  };

  return (
    <div className="space-y-5">
      {/* Section tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {["ee", "eo"].map((s) => (
          <button key={s} onClick={() => { setSection(s); setYear(null); setMkey(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${section === s ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            {s === "ee" ? <FileText size={15} /> : <Mic size={15} />} {SECTION_LABEL[s]}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2">
          {!loading && <Pill tone={source === "db" ? "green" : "amber"}>{source === "db" ? "Base de données" : "Données par défaut (non enregistrées)"}</Pill>}
          <Btn small variant="ghost" icon={RefreshCw} disabled={busy || loading} onClick={reload}>Actualiser</Btn>
        </span>
      </div>

      {source !== "db" && !loading && (
        <Card className="p-4 flex items-center gap-3 border-amber-500/40">
          <CloudOff size={18} className="text-amber-500 shrink-0" />
          <p className={`text-sm ${c.sub}`}>Ces sujets proviennent des données livrées avec le site, pas encore de la base. Importez-les pour pouvoir ajouter / supprimer et les partager avec tous les utilisateurs.</p>
          <Btn small icon={DownloadCloud} disabled={busy} className="ml-auto shrink-0" onClick={seed}>Importer les sujets par défaut</Btn>
        </Card>
      )}

      {/* Filters + add month */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <span className={`text-xs font-bold uppercase tracking-wider ${c.faint}`}>Filtrer</span>
        <select value={yearObj?.year ?? ""} onChange={(e) => { setYear(Number(e.target.value)); setMkey(null); }} aria-label="Année" className={inp}>
          {years.map((y) => <option key={y.year} value={y.year}>{y.year}</option>)}
        </select>
        <select value={monthObj?.key ?? ""} onChange={(e) => setMkey(e.target.value)} aria-label="Mois" className={inp}>
          {yearObj?.months.map((m) => <option key={m.key} value={m.key}>{m.month}</option>)}
        </select>
        <div className={`flex items-center gap-2 flex-1 min-w-[180px] px-3 py-2 rounded-xl border ${c.border}`}>
          <Search size={15} className={c.faint} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans les sujets…" className={`flex-1 bg-transparent text-sm outline-none ${c.text}`} />
          {q && <button onClick={() => setQ("")} aria-label="Effacer"><XCircle size={15} className={c.faint} /></button>}
        </div>
        <AddMonth onAdd={addMonth} busy={busy} c={c} inp={inp} />
      </Card>

      {loading ? (
        <Card className="p-10 text-center"><p className={`text-sm ${c.faint}`}>Chargement…</p></Card>
      ) : !monthObj ? (
        <Card className="p-10 text-center">
          <p className={`font-display font-bold ${c.text}`}>Aucun mois pour cette épreuve</p>
          <p className={`text-sm mt-1 ${c.sub}`}>Importez les données par défaut ou ajoutez un mois.</p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
            <h3 className={`font-display font-bold ${c.text}`}>{monthObj.month} {yearObj.year}
              <span className={`ml-2 text-sm font-normal ${c.faint}`}>· {section === "ee" ? `${monthObj.data.length} combinaisons` : `${countEO(monthObj.data)} sujets`}</span>
            </h3>
            <Btn small variant="ghost" className="text-rose-600" icon={Trash2} disabled={busy} onClick={() => removeMonth(monthObj)}>Supprimer ce mois</Btn>
          </div>
          {section === "ee"
            ? <EEEditor month={monthObj} q={q} onAdd={addCombinaison} onRemove={removeCombinaison} busy={busy} c={c} inp={inp} />
            : <EOEditor month={monthObj} q={q} onAdd={addSujet} onRemove={removeSujet} busy={busy} c={c} inp={inp} />}
        </Card>
      )}
    </div>
  );
}

function AddMonth({ onAdd, busy, c, inp }) {
  const [open, setOpen] = useState(false);
  const [y, setY] = useState(YEAR_NOW);
  const [mn, setMn] = useState(new Date().getMonth() + 1);
  if (!open) return <Btn small variant="ghost" icon={CalendarPlus} onClick={() => setOpen(true)}>Ajouter un mois</Btn>;
  return (
    <span className="flex items-center gap-2">
      <select value={y} onChange={(e) => setY(Number(e.target.value))} aria-label="Année du nouveau mois" className={inp}>{YEAR_CHOICES.map((yy) => <option key={yy} value={yy}>{yy}</option>)}</select>
      <select value={mn} onChange={(e) => setMn(Number(e.target.value))} aria-label="Mois" className={inp}>{MONTH_LABELS.slice(1).map((l, i) => <option key={i} value={i + 1}>{l}</option>)}</select>
      <Btn small icon={Plus} disabled={busy} onClick={() => { onAdd(y, mn); setOpen(false); }}>Créer</Btn>
      <button onClick={() => setOpen(false)} aria-label="Annuler"><XCircle size={16} className={c.faint} /></button>
    </span>
  );
}

const EMPTY_EE = { t1: "", t2: "", theme: "", doc1: "", doc2: "" };

function EEEditor({ month, q, onAdd, onRemove, busy, c, inp }) {
  const [form, setForm] = useState(EMPTY_EE);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const ql = q.trim().toLowerCase();
  const rows = useMemo(() => month.data.map((s, i) => ({ s, i })).filter(({ s }) => !ql || [s.t1, s.t2, s.t3?.theme, s.t3?.doc1, s.t3?.doc2].join(" ").toLowerCase().includes(ql)), [month.data, ql]);
  const ta = `w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const submit = () => {
    if (!form.t1.trim() && !form.t2.trim()) return;
    onAdd({ t1: form.t1.trim(), t2: form.t2.trim(), t3: { theme: form.theme.trim(), doc1: form.doc1.trim(), doc2: form.doc2.trim() } });
    setForm(EMPTY_EE);
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 ? <p className={`text-sm py-4 text-center ${c.faint}`}>Aucune combinaison{ql ? " ne correspond" : ""}.</p> : rows.map(({ s, i }) => (
        <div key={i} className={`rounded-2xl border ${c.border} p-4 flex gap-3`}>
          <span className="w-8 h-8 rounded-xl grad-brand text-white flex items-center justify-center text-sm font-bold shrink-0">{s.n ?? i + 1}</span>
          <div className="flex-1 min-w-0 space-y-1.5 text-sm">
            <p className={c.text}><span className="font-semibold text-blue-600">T1 · </span>{s.t1}</p>
            <p className={c.text}><span className="font-semibold text-blue-600">T2 · </span>{s.t2}</p>
            {s.t3?.theme && <p className={c.sub}><span className="font-semibold text-blue-600">T3 · </span>{s.t3.theme}</p>}
          </div>
          <button onClick={() => onRemove(i)} disabled={busy} aria-label="Supprimer" className={`p-2 rounded-xl h-fit ${c.hoverSoft} text-rose-600 shrink-0`}><Trash2 size={15} /></button>
        </div>
      ))}

      <div className={`rounded-2xl border border-dashed ${c.border} p-4 space-y-2`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${c.faint}`}>Ajouter une combinaison</p>
        <textarea value={form.t1} onChange={set("t1")} rows={2} placeholder="Tâche 1 (message court, 60–120 mots)" className={ta} />
        <textarea value={form.t2} onChange={set("t2")} rows={2} placeholder="Tâche 2 (message, 120–150 mots)" className={ta} />
        <input value={form.theme} onChange={set("theme")} placeholder="Tâche 3 — thème" className={inp + " w-full"} />
        <div className="grid sm:grid-cols-2 gap-2">
          <textarea value={form.doc1} onChange={set("doc1")} rows={3} placeholder="Tâche 3 — Document 1" className={ta} />
          <textarea value={form.doc2} onChange={set("doc2")} rows={3} placeholder="Tâche 3 — Document 2" className={ta} />
        </div>
        <div className="flex justify-end"><Btn small icon={Plus} disabled={busy} onClick={submit}>Ajouter</Btn></div>
      </div>
    </div>
  );
}

function EOEditor({ month, q, onAdd, onRemove, busy, c, inp }) {
  const [form, setForm] = useState({ tache: 2, partie: 1, text: "" });
  const ql = q.trim().toLowerCase();
  const ta = `w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const submit = () => {
    if (!form.text.trim()) return;
    onAdd({ tache: Number(form.tache), partie: Number(form.partie), text: form.text.trim() });
    setForm({ ...form, text: "" });
  };

  return (
    <div className="space-y-5">
      {month.data.length === 0 && <p className={`text-sm py-2 text-center ${c.faint}`}>Aucun sujet — ajoutez-en ci-dessous.</p>}
      {month.data.map((t) => (
        <div key={t.tache}>
          <p className={`font-display font-bold mb-2 ${c.text}`}>Tâche {t.tache}</p>
          <div className="space-y-3">
            {t.parties.map((p) => {
              const items = p.sujets.map((s, si) => ({ s, si })).filter(({ s }) => !ql || s.toLowerCase().includes(ql));
              if (!items.length) return null;
              return (
                <div key={p.partie} className={`rounded-2xl border ${c.border} p-4`}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2">Partie {p.partie}</p>
                  <ul className="space-y-2">
                    {items.map(({ s, si }) => (
                      <li key={si} className="flex gap-2.5 items-start text-sm">
                        <span className="w-5 h-5 rounded-full bg-blue-600/10 text-blue-600 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{si + 1}</span>
                        <p className={`flex-1 ${c.text}`}>{s}</p>
                        <button onClick={() => onRemove(t.tache, p.partie, si)} disabled={busy} aria-label="Supprimer" className={`p-1.5 rounded-lg ${c.hoverSoft} text-rose-600 shrink-0`}><Trash2 size={14} /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className={`rounded-2xl border border-dashed ${c.border} p-4 space-y-2`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${c.faint}`}>Ajouter un sujet</p>
        <div className="flex flex-wrap gap-2">
          <select value={form.tache} onChange={(e) => setForm({ ...form, tache: e.target.value })} aria-label="Tâche" className={inp}>
            <option value={2}>Tâche 2 (interaction)</option>
            <option value={3}>Tâche 3 (point de vue)</option>
          </select>
          <select value={form.partie} onChange={(e) => setForm({ ...form, partie: e.target.value })} aria-label="Partie" className={inp}>
            {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Partie {n}</option>)}
          </select>
        </div>
        <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={2} placeholder="Énoncé du sujet…" className={ta} />
        <div className="flex justify-end"><Btn small icon={Plus} disabled={busy} onClick={submit}>Ajouter</Btn></div>
      </div>
    </div>
  );
}
