import { useEffect, useMemo, useState } from "react";
import { Mail, Save, Send, Users, RotateCcw, CloudOff } from "lucide-react";
import { AccountEmailEditor } from "@/components/admin/AccountEmailEditor";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { getWelcomeEmail, setWelcomeEmail, getEmailTemplate } from "@/services/settingsService";
import { EMAIL_TEMPLATES } from "../../../api/_lib/emailTemplates.js";
import { fetchWelcomeEmailStatus, sendWelcomeTest, sendWelcomeToRecent } from "@/services/adminService";
import { DEFAULT_WELCOME, WELCOME_MAX_CHARS, WELCOME_WINDOW_DAYS, renderWelcome } from "../../../api/_lib/welcomeTemplate.js";

// Admin › Emails: every email the site sends on its own, picked from the row of
// chips at the top. The welcome email has its own richer form (below); the
// others share AccountEmailEditor. Support replies are not listed — their text
// is written per message, from the Messages tab.
// The automatic emails first, then the ones sent by hand (`audience`).
const ORDER = ["welcome", ...Object.keys(EMAIL_TEMPLATES).sort((x, y) => !!EMAIL_TEMPLATES[x].audience - !!EMAIL_TEMPLATES[y].audience)];
const TITLES = { welcome: "Bienvenue", ...Object.fromEntries(Object.entries(EMAIL_TEMPLATES).map(([k, t]) => [k, t.title])) };

export function EmailTemplatesTab() {
  const { c } = useApp();
  const [sel, setSel] = useState("welcome");
  const [enabled, setEnabled] = useState({}); // id → on/off, for the chips
  useEffect(() => {
    getWelcomeEmail().then((r) => setEnabled((p) => ({ ...p, welcome: r.cfg.enabled })));
    for (const id of Object.keys(EMAIL_TEMPLATES)) getEmailTemplate(id).then((r) => setEnabled((p) => ({ ...p, [id]: r.cfg.enabled })));
  }, []);
  const onEnabled = (id) => (v) => setEnabled((p) => ({ ...p, [id]: v }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Courriels">
        {ORDER.map((id) => (
          <button key={id} role="tab" aria-selected={sel === id} onClick={() => setSel(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${sel === id ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            <span aria-hidden="true" className={`w-2 h-2 rounded-full ${enabled[id] === undefined ? "bg-slate-400" : enabled[id] ? "bg-emerald-500" : "bg-rose-500"}`} />
            {TITLES[id]}
            <span className="sr-only">{enabled[id] ? "(activé)" : "(désactivé)"}</span>
          </button>
        ))}
      </div>
      {sel === "welcome"
        ? <WelcomeEmailEditor onEnabled={onEnabled("welcome")} />
        : <AccountEmailEditor key={sel} id={sel} onEnabled={onEnabled(sel)} />}
    </div>
  );
}

// The welcome email: on/off, its wording, a live preview
// (rendered by the very function the server sends with, so what is shown is
// what goes out), a test send to yourself, and a catch-up send to the recent
// signups who never got it. The account emails sent by Supabase itself
// (confirmation code, password reset) are still edited in its dashboard.

const FIELDS = [
  ["subject", "Objet", 1],
  ["intro", "Introduction", 3],
  ["stepsTitle", "Titre des étapes", 1],
  ["steps", "Étapes (une par ligne)", 4],
  ["toolsTitle", "Titre de la liste des outils", 1],
  ["tools", "Outils (un par ligne)", 6],
  ["promoCode", "Code promo (vide = pas d'encadré promo)", 1],
  ["promoText", "Texte au-dessus du code", 2],
  ["buttonLabel", "Texte du bouton (mène à Épreuves)", 1],
  ["outro", "Fin du message", 5],
];

function WelcomeEmailEditor({ onEnabled }) {
  const { c, notify, user } = useApp();
  const [cfg, setCfg] = useState(null);
  const [saved, setSaved] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(null); // "save" | "test" | "send"

  const loadStatus = () => fetchWelcomeEmailStatus().then((r) => setStatus(r.ok ? r.data : { unavailable: true }));
  useEffect(() => {
    getWelcomeEmail().then((r) => { setCfg(r.cfg); setSaved(r.cfg); });
    loadStatus();
  }, []);

  const preview = useMemo(() => (cfg ? renderWelcome(cfg, { firstName: (user?.name || "").split(" ")[0], site: "https://www.tcfpasserelle.com" }) : null), [cfg, user?.name]);
  const dirty = cfg && saved && JSON.stringify(cfg) !== JSON.stringify(saved);
  const size = cfg ? JSON.stringify(cfg).length : 0;

  const save = async () => {
    setBusy("save");
    const r = await setWelcomeEmail(cfg);
    setBusy(null);
    if (!r.ok) return notify(r.error || "Enregistrement refusé.");
    setSaved(cfg);
    notify("Courriel de bienvenue enregistré.");
  };
  // The switch saves at once: it is the control the owner reaches for in a
  // hurry, and a toggle that only takes effect after "Enregistrer" is a trap.
  // It saves the switch alone, on top of the last SAVED text, so it neither
  // publishes nor throws away edits still in the form.
  const toggle = async () => {
    const enabled = !saved.enabled;
    setBusy("save");
    const r = await setWelcomeEmail({ ...saved, enabled });
    setBusy(null);
    if (!r.ok) return notify(r.error || "Enregistrement refusé.");
    setSaved({ ...saved, enabled });
    setCfg((p) => ({ ...p, enabled }));
    onEnabled?.(enabled);
    notify(enabled ? "Courriel de bienvenue activé." : "Courriel de bienvenue désactivé.");
  };

  const test = async () => {
    setBusy("test");
    const r = await sendWelcomeTest(cfg);
    setBusy(null);
    notify(r.ok ? `Test envoyé à ${r.data.to}.` : r.error || (r.unavailable ? "Indisponible en local." : "Envoi refusé."));
  };

  const sendRecent = async () => {
    setBusy("send");
    let total = 0;
    const failed = [];
    // Batches of 10 server-side; stop when done or when a batch sends nothing
    // (only failures left), so a broken address cannot loop forever.
    for (let i = 0; i < 50; i++) {
      const r = await sendWelcomeToRecent();
      if (!r.ok) { notify(r.error || "Envoi refusé."); break; }
      total += r.data.sent;
      failed.push(...r.data.failed);
      if (r.data.remaining <= 0 || r.data.sent === 0) break;
    }
    setBusy(null);
    if (total || failed.length) notify(`${total} courriel(s) envoyé(s)${failed.length ? ` · ${failed.length} échec(s)` : ""}.`);
    loadStatus();
  };

  if (!cfg) return <Card className="p-6"><div aria-hidden="true" className={`h-40 animate-pulse rounded-2xl ${c.track}`} /></Card>;

  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const label = `block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <h3 className={`flex items-center gap-2 font-display font-bold ${c.text}`}><Mail size={17} className="text-blue-600" /> Courriel de bienvenue</h3>
          <button onClick={toggle} disabled={busy !== null} role="switch" aria-checked={saved.enabled} aria-label="Activer le courriel de bienvenue"
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${saved.enabled ? "bg-blue-600" : c.track}`}>
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${saved.enabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <p className={`text-sm ${c.sub}`}>
          Envoyé une seule fois à chaque nouveau compte, dès la fin de l&apos;inscription (code de confirmation saisi ou première connexion Google),
          depuis contact@tcfpasserelle.com. {saved.enabled ? <strong className="text-emerald-600">Activé.</strong> : <strong className="text-amber-600">Désactivé — aucun envoi.</strong>}
        </p>
        {status?.unavailable && (
          <p className={`mt-3 text-sm flex items-center gap-2 ${c.faint}`}><CloudOff size={15} /> Statut d&apos;envoi indisponible ici (fonctions serverless absentes en local).</p>
        )}
        {status && !status.unavailable && !status.mailConfigured && (
          <p className="mt-3 text-sm text-rose-600">La boîte d&apos;envoi (SMTP Hostinger) n&apos;est pas configurée sur le serveur : rien ne partira.</p>
        )}
        {status && !status.unavailable && (
          <div className={`mt-4 p-4 rounded-2xl border flex items-center gap-3 flex-wrap ${c.border}`}>
            <Users size={17} className="text-blue-600 shrink-0" />
            <p className={`text-sm flex-1 min-w-[12rem] ${c.text}`}>
              {status.pending > 0
                ? <><strong>{status.pending}</strong> compte(s) inscrit(s) ces {WELCOME_WINDOW_DAYS} derniers jours ne l&apos;ont pas encore reçu.</>
                : <>Tous les comptes des {WELCOME_WINDOW_DAYS} derniers jours l&apos;ont reçu.</>}
            </p>
            {status.pending > 0 && (
              <Btn small icon={Send} disabled={busy !== null || !saved.enabled || dirty} onClick={sendRecent}
                title={!saved.enabled ? "Activez d'abord le courriel" : dirty ? "Enregistrez d'abord vos modifications" : undefined}>
                {busy === "send" ? "Envoi…" : `Leur envoyer maintenant`}
              </Btn>
            )}
          </div>
        )}
      </Card>

      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <Card className="p-6 space-y-4">
          <p className={`text-xs ${c.faint}`}>
            Texte simple. Une ligne vide sépare deux paragraphes ; <strong>**deux astérisques**</strong> mettent en gras.
            Le « Bonjour {"{prénom}"}, », le logo et la signature sont ajoutés automatiquement.
          </p>
          {FIELDS.map(([k, l, rows]) => (
            <div key={k}>
              <label className={label} htmlFor={`welcome-${k}`}>{l}</label>
              {rows === 1
                ? <input id={`welcome-${k}`} value={cfg[k]} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} className={`${inp} ${k === "promoCode" ? "font-mono2 uppercase" : ""}`} />
                : <textarea id={`welcome-${k}`} rows={rows} value={cfg[k]} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} className={inp} />}
            </div>
          ))}
          <p className={`text-xs ${size > WELCOME_MAX_CHARS ? "text-rose-600 font-semibold" : c.faint}`}>{size} / {WELCOME_MAX_CHARS} caractères</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Btn icon={Save} disabled={busy !== null || !dirty || size > WELCOME_MAX_CHARS} onClick={save}>{busy === "save" ? "Enregistrement…" : "Enregistrer"}</Btn>
            <Btn variant="ghost" icon={Send} disabled={busy !== null} onClick={test}>{busy === "test" ? "Envoi…" : "M'envoyer un test"}</Btn>
            <Btn variant="ghost" icon={RotateCcw} disabled={busy !== null} onClick={() => setCfg({ ...DEFAULT_WELCOME, enabled: cfg.enabled })}>Texte par défaut</Btn>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <p className={`px-5 py-3 text-xs border-b ${c.border} ${c.faint}`}>Aperçu · <strong className={c.text}>{preview.subject}</strong></p>
          {/* Rendered by renderWelcome — the same function the server sends with.
              Every field is escaped there, so this HTML carries no admin markup. */}
          <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: preview.html }} />
        </Card>
      </div>
    </div>
  );
}
