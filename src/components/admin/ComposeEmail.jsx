import { useEffect, useMemo, useState } from "react";
import { PenSquare, Send, RotateCcw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn } from "@/components/common";
import { sendComposedEmail } from "@/services/adminService";
import { LINK_TARGETS, COMPOSE_DEFAULTS, COMPOSE_MAX_BODY, renderComposed } from "../../../api/_lib/emailTemplates.js";

// « Nouveau courriel »: a one-off email to one address, in the same letter as
// the automatic emails (logo, greeting, signature, buttons). Only the address,
// first name, subject and body are written here. Once sent it is listed under
// Messages → Envoyés. The unsent draft is kept in this browser so a refresh
// does not lose it.
const DRAFT_KEY = "admin-compose-draft";
const EMPTY = { to: "", firstName: "", ...COMPOSE_DEFAULTS };

function loadDraft() {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") }; } catch { return EMPTY; }
}

export function ComposeEmail() {
  const { c, notify } = useApp();
  const [d, setD] = useState(loadDraft);
  const [busy, setBusy] = useState(null); // "test" | "send"
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* private mode */ } }, [d]);
  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }));

  const preview = useMemo(() => renderComposed(d, { firstName: d.firstName, site: "https://www.tcfpasserelle.com" }), [d]);
  const validTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.to.trim());
  const ready = d.subject.trim() && d.body.trim() && d.body.length <= COMPOSE_MAX_BODY;

  const run = async (action) => {
    if (action === "send" && !window.confirm(`Envoyer « ${d.subject.trim()} » à ${d.to.trim()} ?`)) return;
    setBusy(action);
    const r = await sendComposedEmail(action, d);
    setBusy(null);
    if (!r.ok) return notify(r.error || (r.unavailable ? "Indisponible en local." : "Envoi refusé."));
    if (action === "test") return notify(`Test envoyé à ${r.data.to}.`);
    notify(`Courriel envoyé à ${r.data.to}. Il apparaît dans Messages → Envoyés.`);
    setD(EMPTY);
  };

  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const label = `block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`;
  const code = `font-mono2 text-[12px] px-1.5 py-0.5 rounded-md ${c.hoverSoft} ${c.text}`;

  return (
    <div className="grid xl:grid-cols-2 gap-4 items-start">
      <Card className="p-6 space-y-4">
        <h3 className={`flex items-center gap-2 font-display font-bold ${c.text}`}><PenSquare size={17} className="text-blue-600" /> Nouveau courriel</h3>
        <div className={`text-xs space-y-1.5 ${c.faint}`}>
          <p>Une ligne vide sépare deux paragraphes ; <strong>**deux astérisques**</strong> mettent en gras. Le « Bonjour {"{prénom}"}, », le logo et la signature sont ajoutés automatiquement.</p>
          <p>Bouton : un paragraphe seul de la forme <span className={code}>[Texte](lien)</span>, où lien = {Object.keys(LINK_TARGETS).map((k) => <span key={k} className={`${code} mr-1`}>{k}</span>)}</p>
        </div>
        <div className="grid sm:grid-cols-[minmax(0,1fr)_12rem] gap-3">
          <div>
            <label className={label} htmlFor="compose-to">Destinataire</label>
            <input id="compose-to" type="email" value={d.to} onChange={set("to")} placeholder="adresse@exemple.com" className={inp} />
          </div>
          <div>
            <label className={label} htmlFor="compose-name">Prénom (facultatif)</label>
            <input id="compose-name" value={d.firstName} onChange={set("firstName")} placeholder="Bonjour," className={inp} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="compose-subject">Objet</label>
          <input id="compose-subject" value={d.subject} onChange={set("subject")} maxLength={200} className={inp} />
        </div>
        <div>
          <label className={label} htmlFor="compose-body">Message</label>
          <textarea id="compose-body" rows={14} value={d.body} onChange={set("body")} className={inp} />
        </div>
        <p className={`text-xs ${d.body.length > COMPOSE_MAX_BODY ? "text-rose-600 font-semibold" : c.faint}`}>{d.body.length} / {COMPOSE_MAX_BODY} caractères</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Btn icon={Send} disabled={busy !== null || !ready || !validTo} onClick={() => run("send")}
            title={!validTo ? "Saisissez une adresse valide" : !ready ? "Objet et message requis" : undefined}>
            {busy === "send" ? "Envoi…" : "Envoyer"}
          </Btn>
          <Btn variant="ghost" icon={Send} disabled={busy !== null || !ready} onClick={() => run("test")}>{busy === "test" ? "Envoi…" : "M'envoyer un test"}</Btn>
          <Btn variant="ghost" icon={RotateCcw} disabled={busy !== null} onClick={() => setD(EMPTY)}>Effacer</Btn>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <p className={`px-5 py-3 text-xs border-b ${c.border} ${c.faint}`}>Aperçu · <strong className={c.text}>{preview.subject || "(sans objet)"}</strong></p>
        {/* Rendered by renderComposed — the function the server sends with.
            Every field is escaped there, so this HTML carries no admin markup. */}
        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: preview.html }} />
      </Card>
    </div>
  );
}
