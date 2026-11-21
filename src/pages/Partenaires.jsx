import { useState } from "react";
import { CheckCircle2, ArrowRight, XCircle, School, Video, Handshake, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn, Segmented } from "@/components/common";
import { COUNTRIES } from "@/constants/exam";
import { submitPartnerApplication } from "@/services/partnerService";

// « Devenir partenaire » — the one door for language schools, content creators
// and any other partnership. Each application lands in Administration →
// Partenaires and in the team's mailbox (api/_lib/public/partner.js); the next
// step is a meeting, so the page names what a partner gets without quoting the
// terms — those are agreed case by case.

// Same list as TESTS in api/_lib/public/partner.js (the server drops anything else).
const TESTS = ["TCF Canada", "TCF tout public", "TCF Québec", "TEF", "DELF / DALF"];

const KINDS = [
  {
    id: "school", label: "École / centre", Icon: School,
    title: "Écoles et centres de langues",
    points: [
      "Un essai gratuit pour une classe, avant tout engagement",
      "L'accès Premium pour vos élèves, à un tarif de groupe",
      "Un espace enseignant pour suivre la progression de chaque élève (bientôt)",
    ],
  },
  {
    id: "creator", label: "Créateur de contenu", Icon: Video,
    title: "Créateurs de contenu",
    points: [
      "Un code promo à votre nom pour votre audience",
      "Une commission sur chaque abonnement vendu avec votre code",
      "Un accès Premium offert pour tester la plateforme",
    ],
  },
  {
    id: "other", label: "Autre", Icon: Handshake,
    title: "Autres partenariats",
    points: [
      "Associations, salons, consultants en immigration…",
      "Un projet commun autour du TCF Canada",
      "Une réponse de notre équipe sous 48 h",
    ],
  },
];

const EMPTY = {
  name: "", email: "", phone: "", country: "", city: "",
  organisation: "", role: "", studentsPerYear: "", tests: [], currentPrep: "",
  links: { instagram: "", youtube: "", tiktok: "", other: "" }, audienceSize: "", audienceCountry: "", topics: "",
  message: "", website: "",
};

export function Partenaires() {
  const { c, t, user, lang, notify } = useApp();
  const [kind, setKind] = useState("school");
  const [form, setForm] = useState({ ...EMPTY, name: user?.name || "", email: user?.email || "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(""); };
  const setLink = (k) => (e) => { setForm({ ...form, links: { ...form.links, [k]: e.target.value } }); setError(""); };
  const toggleTest = (x) => setForm({ ...form, tests: form.tests.includes(x) ? form.tests.filter((y) => y !== x) : [...form.tests, x] });
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const lbl = `block text-xs font-semibold mb-1.5 ${c.sub}`;
  const current = KINDS.find((k) => k.id === kind);

  const send = async () => {
    if (!form.name.trim()) return setError(t("Indiquez votre nom."));
    if (!/.+@.+\..+/.test(form.email)) return setError(t("Entrez une adresse email valide."));
    if (!consent) return setError(t("Cochez la case pour que nous puissions vous recontacter."));
    setBusy(true);
    const r = await submitPartnerApplication({ ...form, kind, lang });
    setBusy(false);
    if (!r.ok) return setError(r.error ? t(r.error) : t("L'envoi a échoué. Réessayez dans un instant."));
    setSent(true);
    notify(t("Demande envoyée !"));
  };

  return (
    <PageShell back eyebrow={t("Partenaires")} title={t("Travaillons ensemble")}
      sub={t("Écoles de langues, créateurs de contenu, associations : préparons ensemble vos élèves et votre audience au TCF Canada.")}>
      {/* What each kind of partner gets — the terms themselves are agreed in the meeting. */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {KINDS.map((k) => {
          const on = k.id === kind;
          return (
            <button type="button" key={k.id} onClick={() => { setKind(k.id); setError(""); }} aria-pressed={on}
              className={`text-left rounded-3xl border-2 p-5 transition ${c.card} ${on ? "border-blue-600 shadow-lg -translate-y-0.5" : `${c.border} hover:-translate-y-0.5`}`}>
              <span className={`grid place-items-center w-11 h-11 rounded-2xl ${on ? "bg-blue-600 text-white" : "bg-blue-600/10 text-blue-600"}`}><k.Icon size={20} /></span>
              <h2 className={`mt-4 font-display font-extrabold text-lg ${c.text}`}>{t(k.title)}</h2>
              <ul className="mt-3 space-y-2">
                {k.points.map((p) => (
                  <li key={p} className={`flex gap-2 text-sm ${c.sub}`}><Check size={15} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />{t(p)}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-5 gap-6 items-start">
        <Card className="md:col-span-3 min-w-0 p-6 md:p-7">
          {sent ? (
            <div className="text-center py-10 rise">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
              <p className={`mt-4 font-display font-bold text-lg ${c.text}`}>{t("Demande envoyée")}</p>
              <p className={`mt-1 text-sm ${c.sub}`}>{t("Merci ! Notre équipe vous recontacte sous 48 h pour fixer un rendez-vous.")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Segmented items={KINDS.map(({ id, label, Icon }) => ({ id, label, Icon }))} value={kind}
                onChange={(k) => { setKind(k); setError(""); }} label={t("Type de partenariat")} />

              <div className="grid sm:grid-cols-2 gap-4">
                <label><span className={lbl}>{t("Votre nom")} *</span><input value={form.name} onChange={set("name")} className={inp} autoComplete="name" /></label>
                <label><span className={lbl}>{t("Adresse email")} *</span><input value={form.email} onChange={set("email")} type="email" className={inp} autoComplete="email" /></label>
                <label><span className={lbl}>{t("Numéro WhatsApp")}{kind === "school" ? " *" : ""}</span><input value={form.phone} onChange={set("phone")} type="tel" placeholder="+213 5XX XX XX XX" className={inp} autoComplete="tel" /></label>
                <label><span className={lbl}>{t("Pays")}</span>
                  <select value={form.country} onChange={set("country")} className={inp}>
                    <option value="">—</option>
                    {COUNTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
              </div>

              {kind === "school" && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label><span className={lbl}>{t("Nom de l'établissement")} *</span><input value={form.organisation} onChange={set("organisation")} className={inp} autoComplete="organization" /></label>
                    <label><span className={lbl}>{t("Ville")}</span><input value={form.city} onChange={set("city")} className={inp} /></label>
                    <label><span className={lbl}>{t("Votre fonction")}</span><input value={form.role} onChange={set("role")} placeholder={t("Directeur, enseignant…")} className={inp} /></label>
                    <label><span className={lbl}>{t("Élèves préparant un test de français, par an")}</span><input value={form.studentsPerYear} onChange={set("studentsPerYear")} placeholder="50" className={inp} /></label>
                  </div>
                  <div>
                    <span className={lbl}>{t("Examens préparés")}</span>
                    <div className="flex flex-wrap gap-2">
                      {TESTS.map((x) => {
                        const on = form.tests.includes(x);
                        return (
                          <button type="button" key={x} onClick={() => toggleTest(x)} aria-pressed={on}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? "bg-blue-600 border-blue-600 text-white" : `${c.border} ${c.card} ${c.sub} ${c.hoverSoft}`}`}>
                            {x}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="block"><span className={lbl}>{t("Comment vos élèves se préparent-ils aujourd'hui ?")}</span><textarea value={form.currentPrep} onChange={set("currentPrep")} rows={3} maxLength={1000} className={inp} /></label>
                </>
              )}

              {kind === "creator" && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label><span className={lbl}>Instagram</span><input value={form.links.instagram} onChange={setLink("instagram")} placeholder="https://instagram.com/…" className={inp} /></label>
                    <label><span className={lbl}>YouTube</span><input value={form.links.youtube} onChange={setLink("youtube")} placeholder="https://youtube.com/@…" className={inp} /></label>
                    <label><span className={lbl}>TikTok</span><input value={form.links.tiktok} onChange={setLink("tiktok")} placeholder="https://tiktok.com/@…" className={inp} /></label>
                    <label><span className={lbl}>{t("Autre lien")}</span><input value={form.links.other} onChange={setLink("other")} className={inp} /></label>
                    <label><span className={lbl}>{t("Taille de l'audience")}</span><input value={form.audienceSize} onChange={set("audienceSize")} placeholder={t("ex. 25 000 abonnés")} className={inp} /></label>
                    <label><span className={lbl}>{t("Pays de votre audience")}</span><input value={form.audienceCountry} onChange={set("audienceCountry")} placeholder={t("ex. Algérie, Maroc")} className={inp} /></label>
                  </div>
                  <label className="block"><span className={lbl}>{t("Vos sujets")}</span><input value={form.topics} onChange={set("topics")} placeholder={t("Canada, immigration, français…")} className={inp} /></label>
                </>
              )}

              {kind === "other" && (
                <label className="block"><span className={lbl}>{t("Organisation")}</span><input value={form.organisation} onChange={set("organisation")} className={inp} autoComplete="organization" /></label>
              )}

              <label className="block"><span className={lbl}>{t(kind === "other" ? "Votre proposition" : "Votre message")}{kind === "other" ? " *" : ""}</span>
                <textarea value={form.message} onChange={set("message")} rows={4} maxLength={3000} className={inp} />
              </label>

              {/* Honeypot: hidden from people, filled by bots (dropped by the server). */}
              <input value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" />

              <label className={`flex items-start gap-2.5 text-sm ${c.sub}`}>
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(""); }} className="mt-1 accent-blue-600" />
                <span>{t("J'accepte que l'équipe TCF Passerelle me recontacte au sujet de ce partenariat.")}</span>
              </label>

              {error && <p className="text-sm text-rose-600 flex items-start gap-2"><XCircle size={15} className="shrink-0 mt-0.5" />{error}</p>}
              <Btn icon={ArrowRight} disabled={busy} onClick={send}>{t(busy ? "Envoi…" : "Envoyer ma demande")}</Btn>
            </div>
          )}
        </Card>

        <Card className="md:col-span-2 min-w-0 p-6">
          <p className={`text-xs font-bold uppercase tracking-widest ${c.faint}`}>{t("Comment ça se passe")}</p>
          <ol className="mt-4 space-y-4">
            {[
              ["Vous envoyez votre demande", "Quelques informations sur vous et votre projet."],
              ["Nous vous recontactons", "Sous 48 h, par email ou WhatsApp, pour fixer un rendez-vous."],
              ["Nous décidons ensemble", "Pendant le rendez-vous, nous définissons la formule qui vous convient."],
            ].map(([h, d], i) => (
              <li key={h} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold grid place-items-center shrink-0">{i + 1}</span>
                <span>
                  <span className={`block text-sm font-semibold ${c.text}`}>{t(h)}</span>
                  <span className={`block text-sm ${c.sub}`}>{t(d)}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className={`mt-6 text-sm ${c.sub}`}>{t(current.title)} : {t("chaque partenariat est construit sur mesure.")}</p>
        </Card>
      </div>
    </PageShell>
  );
}
