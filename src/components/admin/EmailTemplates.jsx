import { useEffect, useRef, useState } from "react";
import { Mail, Save, Send, RotateCcw, CloudOff, Ticket, Eye } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Btn, Pill } from "@/components/common";
import {
  fetchEmailTemplates, saveEmailTemplate, resetEmailTemplate, sendTestEmail,
  previewEmailTemplate, listPromoCodes,
} from "@/services/adminService";
import { promoLabel } from "@/services/stripeService";

// Admin › Emails: the wording of the emails the platform sends on its own (the
// renewal reminders). The copy is plain text — a blank line between paragraphs,
// **gras**, and a few [blocs] for the buttons and the discount box — and the
// server turns it into the branded HTML. Nobody edits markup here.
//
// The signup-confirmation and password-reset emails are sent by Supabase Auth,
// not by us, and are edited in the Supabase dashboard; the note at the bottom
// of this tab says so, so nobody hunts for them here.

export function EmailTemplatesTab() {
  const { c, notify } = useApp();
  const [data, setData] = useState(null);
  const [promos, setPromos] = useState([]);
  const [unavailable, setUnavailable] = useState(false);
  const [key, setKey] = useState("expiring_soon");
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState({ subject: "", html: "" });
  const bodyRef = useRef(null);

  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const label = `block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`;
  const chip = `px-2.5 py-1.5 rounded-xl border text-xs text-left ${c.border} ${c.sub} ${c.hoverSoft}`;

  useEffect(() => {
    fetchEmailTemplates().then((r) => {
      if (!r.ok) return setUnavailable(true);
      setData(r.data);
    });
    // Only active codes can be offered — an expired or disabled one would be
    // refused at checkout after the customer has already read the email.
    listPromoCodes().then((r) => setPromos(r.ok ? (r.data.codes || []).filter((p) => p.active) : []));
  }, []);

  const template = data?.templates.find((t) => t.key === key);

  // Opening a template (or reloading after a save/reset) refills the editor.
  useEffect(() => {
    if (!template) return;
    setDraft({ subject: template.subject, body: template.body, enabled: template.enabled, promoCode: template.promoCode || "" });
    setDirty(false);
  }, [template]);

  // The preview is rendered by the server, debounced while typing. `stale`
  // drops a slow response that lands after a newer one.
  useEffect(() => {
    if (!draft) return undefined;
    let stale = false;
    const id = setTimeout(async () => {
      const r = await previewEmailTemplate({ key, subject: draft.subject, body: draft.body, promoCode: draft.promoCode });
      if (!stale && r.ok) setPreview(r.data);
    }, 350);
    return () => { stale = true; clearTimeout(id); };
  }, [draft, key]);

  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true); };

  // Drops a variable or a block where the cursor is, so nobody has to remember
  // the exact spelling of a tag — a typo there renders as nothing at all.
  const insert = (token) => {
    const el = bodyRef.current;
    if (!el) return set({ body: `${draft.body}${token}` });
    const { selectionStart: start, selectionEnd: end } = el;
    set({ body: draft.body.slice(0, start) + token + draft.body.slice(end) });
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const reload = async () => {
    const r = await fetchEmailTemplates();
    if (r.ok) setData(r.data);
  };

  const save = async () => {
    setBusy("save");
    const r = await saveEmailTemplate({ key, ...draft });
    setBusy("");
    if (!r.ok) return notify(r.error || "Enregistrement refusé.");
    await reload();
    notify("Modèle enregistré.");
  };

  const test = async () => {
    setBusy("test");
    const r = await sendTestEmail({ key, subject: draft.subject, body: draft.body, promoCode: draft.promoCode });
    setBusy("");
    notify(r.ok ? `Test envoyé à ${r.data.sentTo}.` : (r.error || "Envoi du test impossible."));
  };

  const reset = async () => {
    if (!window.confirm("Rétablir le texte d'origine de ce modèle ? Vos modifications seront perdues.")) return;
    setBusy("reset");
    const r = await resetEmailTemplate(key);
    setBusy("");
    if (!r.ok) return notify(r.error || "Réinitialisation impossible.");
    await reload();
    notify("Modèle réinitialisé.");
  };

  if (unavailable) {
    return (
      <Card className="p-4 flex items-center gap-3 border-amber-500/40">
        <CloudOff size={18} className="text-amber-500 shrink-0" />
        <p className={`text-sm ${c.sub}`}>
          Les modèles d'email nécessitent les routes serveur (indisponibles avec <code>vite</code> seul&nbsp;;
          lancez <code>vercel dev</code> ou consultez la version déployée).
        </p>
      </Card>
    );
  }
  if (!data || !draft) return <div className={`animate-pulse rounded-2xl h-64 ${c.track}`} aria-hidden="true" />;

  return (
    <div className="space-y-4">
      {/* Which email is being edited. */}
      <div className="flex gap-2 flex-wrap">
        {data.templates.map((t) => (
          <button key={t.key} onClick={() => setKey(t.key)}
            className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors flex items-center gap-2
              ${key === t.key ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            <Mail size={15} />{t.label}
            {!t.enabled && <span className="text-[11px] font-bold uppercase opacity-80">· désactivé</span>}
          </button>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h3 className={`font-display font-bold ${c.text}`}>{template.label}</h3>
            <p className={`text-sm mt-1 ${c.sub}`}>{template.description}</p>
            <p className={`text-xs mt-2 ${c.faint}`}>{template.when}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {template.customized ? <Pill tone="blue">Personnalisé</Pill> : <Pill tone="slate">Texte d'origine</Pill>}
            {/* Pausing an email stops it going out without losing the copy. */}
            <label className={`flex items-center gap-2 text-sm font-semibold cursor-pointer ${c.text}`}>
              <input type="checkbox" checked={draft.enabled} onChange={(e) => set({ enabled: e.target.checked })}
                className="w-4 h-4 accent-blue-600" />
              Actif
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="tpl-subject">Objet du message</label>
            <input id="tpl-subject" value={draft.subject} onChange={(e) => set({ subject: e.target.value })} maxLength={200} className={inp} />
          </div>

          <div>
            <label className={label} htmlFor="tpl-body">Texte du message</label>
            <textarea id="tpl-body" ref={bodyRef} value={draft.body} onChange={(e) => set({ body: e.target.value })}
              rows={18} maxLength={8000} className={`text-sm leading-relaxed ${inp}`} />
            <p className={`text-xs mt-2 ${c.faint}`}>
              Écrivez comme dans un courriel normal. Une ligne vide sépare deux paragraphes,
              <strong className={c.sub}> **entre deux étoiles** </strong> met en gras. L'en-tête et le pied de page
              Passerelle sont ajoutés automatiquement.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className={label}>Personnalisation</span>
              <div className="flex flex-wrap gap-1.5">
                {data.vars.map((v) => (
                  <button key={v.name} type="button" onClick={() => insert(`{{${v.name}}}`)} title={v.label} className={`${chip} font-mono2`}>
                    {`{{${v.name}}}`}
                  </button>
                ))}
              </div>
              <p className={`text-xs mt-2 ${c.faint}`}>Remplacé par les informations du client à l'envoi.</p>
            </div>
            <div>
              <span className={label}>Blocs</span>
              <div className="flex flex-col gap-1.5">
                {data.blocks.map((b) => (
                  <button key={b.insert} type="button" onClick={() => insert(b.insert)} className={chip}>
                    <span className={`font-mono2 ${c.text}`}>{b.insert.trim()}</span>
                    <span className="block mt-0.5 opacity-80">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="tpl-promo">
              <Ticket size={13} className="inline mb-0.5 mr-1" />Code de réduction <span className="normal-case font-medium">(optionnel)</span>
            </label>
            <select id="tpl-promo" value={draft.promoCode} onChange={(e) => set({ promoCode: e.target.value })} className={inp}>
              <option value="">Aucun — l'encadré du code n'apparaît pas</option>
              {promos.map((p) => (
                <option key={p.id} value={p.code}>{p.code} · {promoLabel(p)}</option>
              ))}
            </select>
            <p className={`text-xs mt-2 ${c.faint}`}>
              Les codes viennent de Tarifs › Promos (codes actifs uniquement). Le même code part à tous les destinataires,
              et s'affiche là où vous avez placé le bloc <span className="font-mono2">[promo]</span>.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Btn variant="ghost" small icon={RotateCcw} disabled={!!busy || !template.customized} onClick={reset}>
            Réinitialiser
          </Btn>
          <Btn variant="ghost" small icon={Send} disabled={!!busy} onClick={test}>
            {busy === "test" ? "Envoi…" : "M'envoyer un test"}
          </Btn>
          <Btn small icon={Save} disabled={!!busy || !dirty} onClick={save}>
            {busy === "save" ? "Enregistrement…" : "Enregistrer"}
          </Btn>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className={`flex items-center gap-2 font-display font-bold mb-1.5 ${c.text}`}>
          <Eye size={17} className="text-blue-600" /> Aperçu
        </h3>
        <p className={`text-sm mb-4 ${c.sub}`}>
          Rendu par le serveur, avec des valeurs d'exemple — objet&nbsp;: <strong className={c.text}>{preview.subject}</strong>
        </p>
        {/* Sandboxed: nothing in an email ever needs to run a script. */}
        <iframe title="Aperçu de l'email" srcDoc={preview.html} sandbox=""
          className="w-full h-[560px] rounded-2xl border-0 bg-white" />
      </Card>

      <Card className="p-5 flex items-start gap-3">
        <Mail size={17} className={`shrink-0 mt-0.5 ${c.faint}`} />
        <p className={`text-sm ${c.sub}`}>
          Les emails de <strong className={c.text}>confirmation d'inscription</strong> et de{" "}
          <strong className={c.text}>réinitialisation du mot de passe</strong> sont envoyés par Supabase, pas par
          Passerelle&nbsp;: ils se modifient dans le tableau de bord Supabase (Authentication → Email Templates).
        </p>
      </Card>
    </div>
  );
}
