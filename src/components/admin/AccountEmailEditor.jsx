import { useEffect, useMemo, useState } from "react";
import { Mail, Save, Send, RotateCcw, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { getEmailTemplate, setEmailTemplate } from "@/services/settingsService";
import { sendEmailTest, fetchOfferStatus, sendOfferBatch } from "@/services/adminService";
import { SendProgress } from "@/components/admin/SendProgress";
import { EMAIL_TEMPLATES, EMAIL_MAX_CHARS, LINK_TARGETS, renderEmail } from "../../../api/_lib/emailTemplates.js";

// Editor for one of the automatic account emails (reminder, expired,
// deactivated, deleted): on/off, subject, body, live preview, test send. The
// preview and the real send go through the same renderEmail, with the
// template's sample values standing in for the real ones.
//
// The offer email (`audience`) is sent by hand, to one of three groups
// (api/_lib/offer.js AUDIENCES); nobody receives the same subject twice.
const AUDIENCE_LABELS = {
  active: "Comptes actifs sans abonnement",
  free: "Tous sauf abonnés en cours",
  all: "Tous les comptes",
};
export function AccountEmailEditor({ id, onEnabled }) {
  const { c, notify, user } = useApp();
  const t = EMAIL_TEMPLATES[id];
  const [cfg, setCfg] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(null); // "save" | "test" | "send"
  const [progress, setProgress] = useState(null); // manual send: { done, total, sent, failed, finished }
  const [audience, setAudience] = useState(null); // offer only: { pending: { active, free, all }, minDays, mailConfigured }
  const groups = t.audiences || Object.keys(AUDIENCE_LABELS);
  const [group, setGroup] = useState(groups[0]); // hand-sent only: who the send goes to

  const loadAudience = () => fetchOfferStatus(id).then((r) => setAudience(r.ok ? r.data : { unavailable: true, error: r.error }));
  useEffect(() => {
    getEmailTemplate(id).then((r) => { setCfg(r.cfg); setSaved(r.cfg); });
    if (t.audience) loadAudience();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => (cfg ? renderEmail(id, cfg, { firstName: (user?.name || "").split(" ")[0], site: "https://www.tcfpasserelle.com" }) : null), [id, cfg, user?.name]);
  const dirty = cfg && saved && JSON.stringify(cfg) !== JSON.stringify(saved);
  const size = cfg ? JSON.stringify(cfg).length : 0;

  const save = async () => {
    setBusy("save");
    const r = await setEmailTemplate(id, cfg);
    setBusy(null);
    if (!r.ok) return notify(r.error || "Enregistrement refusé.");
    setSaved(cfg);
    notify("Courriel enregistré.");
  };
  // Saves the switch alone, on top of the last SAVED text (see the welcome
  // editor for why it does not wait for "Enregistrer").
  const toggle = async () => {
    const enabled = !saved.enabled;
    setBusy("save");
    const r = await setEmailTemplate(id, { ...saved, enabled });
    setBusy(null);
    if (!r.ok) return notify(r.error || "Enregistrement refusé.");
    setSaved({ ...saved, enabled });
    setCfg((p) => ({ ...p, enabled }));
    onEnabled?.(enabled);
    notify(enabled ? "Courriel activé." : "Courriel désactivé.");
  };
  const test = async () => {
    setBusy("test");
    const r = await sendEmailTest(id, cfg);
    setBusy(null);
    notify(r.ok ? `Test envoyé à ${r.data.to}.` : r.error || (r.unavailable ? "Indisponible en local." : "Envoi refusé."));
  };

  // Batches of 10 server-side; stops when done or when a batch sends nothing
  // (only failures left), so a broken address cannot loop forever.
  const sendAll = async () => {
    setBusy("send");
    let total = 0;
    const failed = [];
    const start = audience?.pending?.[group] || 0;
    if (!window.confirm(`Envoyer « ${saved.subject} » à ${start} compte(s) (${AUDIENCE_LABELS[group].toLowerCase()}) ?`)) { setBusy(null); return; }
    setProgress({ done: 0, total: start, sent: 0, failed: 0, finished: false });
    for (let i = 0; i < 50; i++) {
      const r = await sendOfferBatch(group, id);
      if (!r.ok) { notify(r.error || "Envoi refusé."); break; }
      total += r.data.sent;
      failed.push(...r.data.failed);
      setProgress({ done: total + failed.length, total: Math.max(start, total + failed.length), sent: total, failed: failed.length, finished: false });
      if (r.data.remaining <= 0 || r.data.sent === 0) break;
    }
    setBusy(null);
    setProgress((p) => p && { ...p, finished: true });
    if (total || failed.length) notify(`${total} courriel(s) envoyé(s)${failed.length ? ` · ${failed.length} échec(s)` : ""}.`);
    loadAudience();
  };

  if (!cfg) return <Card className="p-6"><div aria-hidden="true" className={`h-40 animate-pulse rounded-2xl ${c.track}`} /></Card>;

  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const label = `block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`;
  const code = `font-mono2 text-[12px] px-1.5 py-0.5 rounded-md ${c.hoverSoft} ${c.text}`;
  const names = Object.keys(t.placeholders).filter((n) => !n.startsWith("_")); // "_" = data, not text

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <h3 className={`flex items-center gap-2 font-display font-bold ${c.text}`}><Mail size={17} className="text-blue-600" /> {t.title}</h3>
          <button onClick={toggle} disabled={busy !== null} role="switch" aria-checked={saved.enabled} aria-label={`Activer : ${t.title}`}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${saved.enabled ? "bg-blue-600" : c.track}`}>
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${saved.enabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <p className={`text-sm ${c.sub}`}>
          {t.when} {saved.enabled ? <strong className="text-emerald-600">Activé.</strong> : <strong className="text-amber-600">Désactivé — aucun envoi.</strong>}
        </p>
        {t.audience && audience?.unavailable && (
          <p className={`mt-3 text-sm ${c.faint}`}>Liste indisponible ici{audience.error ? ` (${audience.error})` : " (fonctions serverless absentes en local)"}.</p>
        )}
        {/* Who to send it to, with how many of each group have not had this
            subject yet; then the send button for the chosen group. */}
        {t.audience && audience && !audience.unavailable && (
          <div className={`mt-4 p-4 rounded-2xl border space-y-3 ${c.border}`}>
            <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${c.sub}`}><Users size={15} className="text-blue-600" /> Destinataires</p>
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Destinataires">
              {groups.map((k) => [k, AUDIENCE_LABELS[k]]).map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={group === k} disabled={busy !== null} onClick={() => setGroup(k)}
                  className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${group === k ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
                  {l} · {audience.pending[k]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
            <p className={`text-sm flex-1 min-w-[12rem] ${c.text}`}>
              {audience.pending[group] > 0
                ? <><strong>{audience.pending[group]}</strong> compte(s) n&apos;ont pas encore reçu ce courriel (même objet){group === "active" ? <> — actifs au moins {audience.minDays} jours, jamais abonnés, jamais relancés</> : null}.</>
                : progress ? <>Envoi terminé.</> : <>Tout ce groupe a déjà reçu ce courriel.</>}
            </p>
            {audience.pending[group] > 0 && (
              <Btn small icon={Send} disabled={busy !== null || !saved.enabled || dirty || !audience.mailConfigured} onClick={sendAll}
                title={!saved.enabled ? "Activez d'abord le courriel" : dirty ? "Enregistrez d'abord vos modifications" : undefined}>
                {busy === "send" ? "Envoi…" : `Envoyer à ${audience.pending[group]} compte(s)`}
              </Btn>
            )}
            </div>
            <SendProgress progress={progress} />
          </div>
        )}
      </Card>

      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <Card className="p-6 space-y-4">
          <div className={`text-xs space-y-1.5 ${c.faint}`}>
            <p>Une ligne vide sépare deux paragraphes ; <strong>**deux astérisques**</strong> mettent en gras. Le « Bonjour {"{prénom}"}, », le logo et la signature sont ajoutés automatiquement.</p>
            {names.length > 0 && (
              <p>Remplacés à l&apos;envoi : {names.map((n) => <span key={n} className={`${code} mr-1`}>{`{${n}}`}</span>)} <span>(exemple dans l&apos;aperçu)</span></p>
            )}
            {"_score" in t.placeholders && <p>Résultats : un paragraphe seul <span className={code}>{"{resultats}"}</span> (score, niveau et NCLC par épreuve).</p>}
            {t.promo && <p>Encadré du code : un paragraphe seul <span className={code}>{"{encadre}"}</span> (code, animation et lien « Voir les étapes ») ; code vide = pas d&apos;encadré.</p>}
            {t.countdown && <p>Promo en cours : un paragraphe seul <span className={code}>{"{compteur}"}</span> affiche le compte à rebours animé, <span className={code}>{"{fin}"}</span> la date de fin (heure d&apos;Algérie pour les comptes d&apos;Algérie). Vides quand aucune promo ne tourne.</p>}
            <p>Bouton : un paragraphe seul de la forme <span className={code}>[Texte](lien)</span>, où lien = {Object.keys(LINK_TARGETS).map((k) => <span key={k} className={`${code} mr-1`}>{k}</span>)}</p>
          </div>
          <div>
            <label className={label} htmlFor={`${id}-subject`}>Objet</label>
            <input id={`${id}-subject`} value={cfg.subject} onChange={(e) => setCfg({ ...cfg, subject: e.target.value })} className={inp} />
          </div>
          {t.promo && (
            <div className="grid sm:grid-cols-[10rem_minmax(0,1fr)] gap-3">
              <div>
                <label className={label} htmlFor={`${id}-code`}>Code promo</label>
                <input id={`${id}-code`} value={cfg.promoCode} onChange={(e) => setCfg({ ...cfg, promoCode: e.target.value.toUpperCase() })} className={`${inp} font-mono2 uppercase`} />
              </div>
              <div>
                <label className={label} htmlFor={`${id}-promotext`}>Texte au-dessus du code</label>
                <input id={`${id}-promotext`} value={cfg.promoText} onChange={(e) => setCfg({ ...cfg, promoText: e.target.value })} className={inp} />
              </div>
            </div>
          )}
          <div>
            <label className={label} htmlFor={`${id}-body`}>Message</label>
            <textarea id={`${id}-body`} rows={14} value={cfg.body} onChange={(e) => setCfg({ ...cfg, body: e.target.value })} className={inp} />
          </div>
          <p className={`text-xs ${size > EMAIL_MAX_CHARS ? "text-rose-600 font-semibold" : c.faint}`}>{size} / {EMAIL_MAX_CHARS} caractères</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Btn icon={Save} disabled={busy !== null || !dirty || size > EMAIL_MAX_CHARS} onClick={save}>{busy === "save" ? "Enregistrement…" : "Enregistrer"}</Btn>
            <Btn variant="ghost" icon={Send} disabled={busy !== null} onClick={test}>{busy === "test" ? "Envoi…" : "M'envoyer un test"}</Btn>
            <Btn variant="ghost" icon={RotateCcw} disabled={busy !== null} onClick={() => setCfg({ ...t.defaults, ...(t.promo ? { promoCode: t.promo.code, promoText: t.promo.text } : {}), enabled: cfg.enabled })}>Texte par défaut</Btn>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <p className={`px-5 py-3 text-xs border-b ${c.border} ${c.faint}`}>Aperçu · <strong className={c.text}>{preview.subject}</strong></p>
          {/* Rendered by renderEmail — the function the server sends with.
              Every field is escaped there, so this HTML carries no admin markup. */}
          <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: preview.html }} />
        </Card>
      </div>
    </div>
  );
}
