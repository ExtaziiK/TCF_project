import { useEffect, useMemo, useState } from "react";
import { Mail, Save, Send, RotateCcw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { getEmailTemplate, setEmailTemplate } from "@/services/settingsService";
import { sendEmailTest } from "@/services/adminService";
import { EMAIL_TEMPLATES, EMAIL_MAX_CHARS, LINK_TARGETS, renderEmail } from "../../../api/_lib/emailTemplates.js";

// Editor for one of the automatic account emails (reminder, expired,
// deactivated, deleted): on/off, subject, body, live preview, test send. The
// preview and the real send go through the same renderEmail, with the
// template's sample values standing in for the real ones.
export function AccountEmailEditor({ id, onEnabled }) {
  const { c, notify, user } = useApp();
  const t = EMAIL_TEMPLATES[id];
  const [cfg, setCfg] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(null); // "save" | "test"

  useEffect(() => { getEmailTemplate(id).then((r) => { setCfg(r.cfg); setSaved(r.cfg); }); }, [id]);

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

  if (!cfg) return <Card className="p-6"><div aria-hidden="true" className={`h-40 animate-pulse rounded-2xl ${c.track}`} /></Card>;

  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const label = `block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`;
  const code = `font-mono2 text-[12px] px-1.5 py-0.5 rounded-md ${c.hoverSoft} ${c.text}`;
  const names = Object.keys(t.placeholders);

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
      </Card>

      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <Card className="p-6 space-y-4">
          <div className={`text-xs space-y-1.5 ${c.faint}`}>
            <p>Une ligne vide sépare deux paragraphes ; <strong>**deux astérisques**</strong> mettent en gras. Le « Bonjour {"{prénom}"}, », le logo et la signature sont ajoutés automatiquement.</p>
            {names.length > 0 && (
              <p>Remplacés à l&apos;envoi : {names.map((n) => <span key={n} className={`${code} mr-1`}>{`{${n}}`}</span>)} <span>(exemple dans l&apos;aperçu)</span></p>
            )}
            <p>Bouton : un paragraphe seul de la forme <span className={code}>[Texte](lien)</span>, où lien = {Object.keys(LINK_TARGETS).map((k) => <span key={k} className={`${code} mr-1`}>{k}</span>)}</p>
          </div>
          <div>
            <label className={label} htmlFor={`${id}-subject`}>Objet</label>
            <input id={`${id}-subject`} value={cfg.subject} onChange={(e) => setCfg({ ...cfg, subject: e.target.value })} className={inp} />
          </div>
          <div>
            <label className={label} htmlFor={`${id}-body`}>Message</label>
            <textarea id={`${id}-body`} rows={14} value={cfg.body} onChange={(e) => setCfg({ ...cfg, body: e.target.value })} className={inp} />
          </div>
          <p className={`text-xs ${size > EMAIL_MAX_CHARS ? "text-rose-600 font-semibold" : c.faint}`}>{size} / {EMAIL_MAX_CHARS} caractères</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Btn icon={Save} disabled={busy !== null || !dirty || size > EMAIL_MAX_CHARS} onClick={save}>{busy === "save" ? "Enregistrement…" : "Enregistrer"}</Btn>
            <Btn variant="ghost" icon={Send} disabled={busy !== null} onClick={test}>{busy === "test" ? "Envoi…" : "M'envoyer un test"}</Btn>
            <Btn variant="ghost" icon={RotateCcw} disabled={busy !== null} onClick={() => setCfg({ ...t.defaults, enabled: cfg.enabled })}>Texte par défaut</Btn>
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
