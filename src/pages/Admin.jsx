import { useRef, useState } from "react";
import {
  LayoutDashboard, Users, FileText, Upload, Pencil, CreditCard, MessageCircle,
  TrendingUp, Plus, Trash2, Check, XCircle, Shield, Headphones,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { POSTS } from "@/constants/blog";
import { IMPORT_SAMPLE } from "@/constants/listeningImport";
import { normalizeImportedQuestions } from "@/utils/questionImport";
import { QuestionManager } from "@/components/admin/QuestionManager";

export function Admin() {
  const { c, notify, customListen, addListeningQuestions, removeListeningQuestion, clearListeningQuestions } = useApp();
  const [tab, setTab] = useState("overview");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result));
    reader.readAsText(file);
  };
  const runImport = () => {
    setImportError("");
    try {
      const parsed = JSON.parse(importText);
      const normalized = normalizeImportedQuestions(parsed);
      addListeningQuestions(normalized);
      setImportText("");
    } catch (err) {
      setImportError(err.message || "JSON invalide.");
    }
  };
  const [users, setUsers] = useState([
    { n: "Amira Benali", e: "amira@courriel.ca", p: "Premium Annuel", s: "Actif" },
    { n: "Diego Morales", e: "diego@courriel.ca", p: "Premium Mensuel", s: "Actif" },
    { n: "Lan Nguyen", e: "lan@courriel.ca", p: "Découverte", s: "Actif" },
    { n: "Ivan Petrov", e: "ivan@courriel.ca", p: "Premium Mensuel", s: "Suspendu" },
  ]);
  const [feedback, setFeedback] = useState([
    { n: "Yuki T.", t: "L'audio de la question 14 (série B2) se coupe à la fin.", when: "il y a 3 h" },
    { n: "Fatou D.", t: "Merci pour la correction de ma tâche 3, très détaillée !", when: "hier" },
  ]);
  const tabs = [
    { id: "overview", l: "Aperçu", icon: LayoutDashboard },
    { id: "users", l: "Utilisateurs", icon: Users },
    { id: "questions", l: "Questions", icon: FileText },
    { id: "import", l: "Importer (CO)", icon: Upload },
    { id: "blog", l: "Blogue", icon: Pencil },
    { id: "subs", l: "Abonnements", icon: CreditCard },
    { id: "feedback", l: "Commentaires", icon: MessageCircle },
  ];
  return (
    <PageShell wide eyebrow="Panneau d'administration" title="Gestion de la plateforme" sub="La gestion des questions et l'import sont connectés en direct ; certaines statistiques et listes restent illustratives.">
      <div className="flex gap-2 flex-wrap mb-8">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${tab === t.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            <t.icon size={15} />{t.l}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{ n: "12 418", l: "Utilisateurs inscrits", d: "+312 cette semaine" }, { n: "2 947", l: "Abonnés Premium", d: "+4,1 % ce mois" }, { n: "38 204 $", l: "Revenus mensuels (CAD)", d: "+9,3 % ce mois" }, { n: "4,8 / 5", l: "Satisfaction moyenne", d: "1 204 avis" }].map((s) => (
            <Card key={s.l} className="p-5">
              <p className={`font-display font-extrabold text-3xl grad-text`}>{s.n}</p>
              <p className={`text-sm font-medium mt-1 ${c.text}`}>{s.l}</p>
              <p className="text-xs mt-1 text-emerald-500 font-medium flex items-center gap-1"><TrendingUp size={12} />{s.d}</p>
            </Card>
          ))}
          <Card className="p-6 sm:col-span-2 lg:col-span-4">
            <h3 className={`font-display font-bold mb-4 ${c.text}`}>Activité des 7 derniers jours</h3>
            <div className="flex items-end gap-2 h-32">
              {[62, 78, 71, 88, 95, 54, 60].map((v, i) => (
                <div key={i} className="flex-1 grad-brand rounded-t-lg" style={{ height: `${v}%` }} title={`${v * 14} sessions`} />
              ))}
            </div>
          </Card>
        </div>
      )}
      {tab === "users" && (
        <Card className="p-6 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead><tr className={`text-left text-xs uppercase tracking-wider ${c.faint}`}><th className="pb-3 pr-4 font-semibold">Nom</th><th className="pb-3 pr-4 font-semibold">Courriel</th><th className="pb-3 pr-4 font-semibold">Forfait</th><th className="pb-3 pr-4 font-semibold">Statut</th><th className="pb-3 font-semibold">Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.e} className={`border-t ${c.border}`}>
                  <td className={`py-3.5 pr-4 font-medium ${c.text}`}>{u.n}</td>
                  <td className={`py-3.5 pr-4 ${c.sub}`}>{u.e}</td>
                  <td className="py-3.5 pr-4"><Pill tone={u.p === "Découverte" ? "slate" : "blue"}>{u.p}</Pill></td>
                  <td className="py-3.5 pr-4"><Pill tone={u.s === "Actif" ? "green" : "amber"}>{u.s}</Pill></td>
                  <td className="py-3.5 flex gap-1.5">
                    <button aria-label={`Modifier ${u.n}`} onClick={() => notify("Démo : édition de l'utilisateur.")} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`}><Pencil size={15} /></button>
                    <button aria-label={`Supprimer ${u.n}`} onClick={() => { setUsers(users.filter((x) => x.e !== u.e)); notify("Utilisateur supprimé (démo)."); }} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600`}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {tab === "questions" && <QuestionManager />}
      {tab === "import" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-6">
            <h3 className={`font-display font-bold mb-1.5 ${c.text}`}>Importer des questions de compréhension orale</h3>
            <p className={`text-sm mb-4 ${c.sub}`}>Collez un tableau JSON de questions, ou téléversez un fichier .json. Chaque question doit avoir un énoncé et une liste d'alternatives ; l'audio et l'explication sont optionnels.</p>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Btn small variant="ghost" icon={Upload} onClick={() => fileInputRef.current?.click()}>Choisir un fichier .json</Btn>
                <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImportFile} className="hidden" aria-label="Téléverser un fichier JSON" />
                <Btn small variant="ghost" icon={FileText} onClick={() => setImportText(IMPORT_SAMPLE)}>Charger un exemple</Btn>
              </div>
              <textarea value={importText} onChange={(e) => { setImportText(e.target.value); setImportError(""); }} rows={12} placeholder='[{ "audio": "https://…mp3", "question": "…", "alternatives": ["…","…","…","…"], "answer_index": 0, "explanation": "…", "level": "B1" }]' aria-label="JSON des questions" className={`w-full px-4 py-3 rounded-2xl border font-mono2 text-xs outline-none focus:border-blue-600 ${c.inputCls}`} />
              {importError && <p className="text-sm text-rose-600 flex items-start gap-2"><XCircle size={15} className="shrink-0 mt-0.5" />{importError}</p>}
              <Btn small icon={Upload} onClick={runImport} disabled={!importText.trim()}>Importer ces questions</Btn>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-display font-bold ${c.text}`}>Questions importées ({customListen.length})</h3>
              {customListen.length > 0 && <button onClick={clearListeningQuestions} className="text-xs font-semibold text-rose-600 hover:underline">Tout effacer</button>}
            </div>
            {customListen.length === 0 ? (
              <p className={`text-sm py-6 text-center ${c.faint}`}>Aucune question importée pour l'instant. Elles apparaîtront automatiquement sur la page « Compréhension orale ».</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {customListen.map((q) => (
                  <div key={q.id} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${c.border}`}>
                    <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><Headphones size={15} /></span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${c.text}`}>{q.q}</p>
                      <p className={`text-xs font-mono2 ${c.faint}`}>{q.audio ? "Audio lié" : "Sans audio"} · niveau {q.level} · {q.opts.length} choix</p>
                    </div>
                    <button aria-label="Supprimer cette question" onClick={() => removeListeningQuestion(q.id)} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600 shrink-0`}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
            <p className={`mt-4 text-xs ${c.faint} flex items-start gap-1.5`}><Shield size={13} className="mt-0.5 shrink-0" /> Ici, les questions sont sauvegardées dans le stockage partagé de l'artefact. Dans la version en production, ce même formulaire écrirait directement dans la table « questions » de PostgreSQL.</p>
          </Card>
        </div>
      )}
      {tab === "blog" && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-display font-bold ${c.text}`}>Articles publiés</h3>
            <Btn small icon={Plus} onClick={() => notify("Démo : éditeur d'article.")}>Nouvel article</Btn>
          </div>
          {POSTS.map((p) => (
            <div key={p.id} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl ${c.hoverSoft}`}>
              <div className="flex-1 min-w-0"><p className={`text-sm font-medium truncate ${c.text}`}>{p.t}</p><p className={`text-xs ${c.faint}`}>{p.cat} · {p.date}</p></div>
              <Pill tone="green">Publié</Pill>
              <button aria-label="Modifier" onClick={() => notify("Démo : édition de l'article.")} className={`p-2 rounded-xl ${c.hoverSoft} ${c.sub}`}><Pencil size={15} /></button>
            </div>
          ))}
        </Card>
      )}
      {tab === "subs" && (
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-4 ${c.text}`}>Abonnements actifs</h3>
          {[["Premium Annuel", "1 122 abonnés", "134 640 $ / an"], ["Premium Mensuel", "1 825 abonnés", "34 675 $ / mois"], ["Découverte", "9 471 comptes", "—"]].map(([t, n, r]) => (
            <div key={t} className={`grid grid-cols-3 gap-4 px-4 py-3.5 rounded-2xl items-center ${c.hoverSoft}`}>
              <p className={`text-sm font-medium ${c.text}`}>{t}</p>
              <p className={`text-sm ${c.sub}`}>{n}</p>
              <p className={`text-sm font-mono2 text-right ${c.sub}`}>{r}</p>
            </div>
          ))}
          <p className={`mt-4 text-xs ${c.faint} flex items-center gap-1.5`}><Shield size={13} /> Facturation gérée par Stripe · les remboursements se font depuis le tableau de bord Stripe.</p>
        </Card>
      )}
      {tab === "feedback" && (
        <Card className="p-6">
          <h3 className={`font-display font-bold mb-4 ${c.text}`}>Commentaires à modérer</h3>
          {feedback.length === 0 && <p className={`text-sm py-6 text-center ${c.faint}`}>File de modération vide. Beau travail !</p>}
          {feedback.map((f) => (
            <div key={f.t} className={`flex items-start gap-4 px-4 py-4 rounded-2xl ${c.hoverSoft}`}>
              <span className="w-9 h-9 rounded-full grad-brand text-white text-xs font-bold flex items-center justify-center shrink-0">{f.n[0]}</span>
              <div className="flex-1"><p className={`text-sm ${c.text}`}>{f.t}</p><p className={`text-xs mt-1 ${c.faint}`}>{f.n} · {f.when}</p></div>
              <div className="flex gap-1.5">
                <button aria-label="Approuver" onClick={() => { setFeedback(feedback.filter((x) => x !== f)); notify("Commentaire approuvé."); }} className={`p-2 rounded-xl ${c.hoverSoft} text-emerald-500`}><Check size={16} /></button>
                <button aria-label="Supprimer" onClick={() => { setFeedback(feedback.filter((x) => x !== f)); notify("Commentaire supprimé."); }} className={`p-2 rounded-xl ${c.hoverSoft} text-rose-600`}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </PageShell>
  );
}
