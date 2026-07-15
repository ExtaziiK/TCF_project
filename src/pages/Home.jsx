import { Leaf, ArrowRight, ChevronRight, Quote } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn, SectionHead } from "@/components/common";
import { DemoQuestion } from "@/components/home/DemoQuestion";
import { DemoQuestionSecondary } from "@/components/home/DemoQuestionSecondary";
import { ScoreCalculator } from "@/components/calculator/ScoreCalculator";
import { MemberHome } from "@/components/dashboard/MemberHome";
import { PlanCard } from "@/components/pricing/PlanCard";
import { STATS, FEATURES, WHY, TESTIMONIALS } from "@/constants/home";
import { useLivePlans } from "@/hooks/useLivePlans";
import { MOCK_SECTIONS } from "@/constants/mocks";

// Logged-in users land on their personal dashboard; the marketing landing
// below is only for signed-out traffic.
export function Home() {
  const { user, authReady } = useApp();
  if (!authReady) return null; // avoid a landing flash while the session loads
  if (user) return <MemberHome />;
  return <Landing />;
}

function Landing() {
  const { c, nav, t } = useApp();
  const plans = useLivePlans();
  return (
    <main className="pt-16 md:pt-[72px]">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: "radial-gradient(circle,#2E6BE6,transparent 65%)" }} />
          <div className="absolute -bottom-40 -right-24 w-[420px] h-[420px] rounded-full opacity-15" style={{ background: "radial-gradient(circle,#D8354A,transparent 65%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-16 relative">
          {/* top: hero pitch, full width and centered */}
          <div className="max-w-3xl mx-auto text-center">
            <Pill tone="red" className="rise"><Leaf size={12} /> {t("Reconnu pour Entrée express & la citoyenneté")}</Pill>
            <h1 className={`font-display font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[1.05] mt-5 max-w-2xl mx-auto ${c.text} rise rise-1`}>
              {t("Le français qui vous ouvre")} <span className="grad-text">{t("le Canada.")}</span>
            </h1>
            <p className={`mt-6 text-lg md:text-xl leading-relaxed ${c.sub} mx-auto rise rise-2`}>
              {t("Préparez les quatre épreuves du TCF Canada avec des questions au format officiel, des corrections d'enseignants et un suivi de niveau CECR en temps réel.")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 rise rise-3">
              <Btn variant="accent" icon={ArrowRight} onClick={() => nav("practice")}>{t("Commencer à pratiquer gratuitement")}</Btn>
            </div>
          </div>

          {/* below: the two demo questions, side by side on the same line */}
          <div className="mt-14 md:mt-16 grid lg:grid-cols-2 gap-6 items-center">
            <div className="rise rise-2"><DemoQuestion /></div>
            <div className="rise rise-3"><DemoQuestionSecondary /></div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className={`border-y ${c.border} ${c.tint}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.l} className="text-center">
              <p className="font-display font-extrabold text-3xl md:text-4xl grad-text">{t(s.n)}</p>
              <p className={`mt-1.5 text-sm ${c.sub}`}>{t(s.l)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NCLC CALCULATOR */}
      <section id="calculateur" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24">
        <SectionHead center eyebrow={t("Calculateur")} title={t("Convertissez vos scores en niveaux NCLC")} sub={t("Entrez vos scores TCF Canada et vérifiez si vous atteignez les seuils de votre projet d'immigration.")} />
        <div className="max-w-2xl mx-auto"><ScoreCalculator /></div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
        <SectionHead center eyebrow={t("Modules de pratique")} title={t("Les quatre épreuves, un seul endroit")} sub={t("Chaque module reproduit fidèlement le format, le minutage et le barème du TCF Canada.")} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <button key={f.t} onClick={() => nav(f.route)} className="text-left">
              <Card lift className="p-6 h-full">
                <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/25"><f.icon size={22} /></span>
                <h3 className={`font-display font-bold text-lg mt-5 ${c.text}`}>{t(f.t)}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${c.sub}`}>{t(f.d)}</p>
                <p className="mt-4 text-sm font-semibold text-blue-600 flex items-center gap-1">{t("Pratiquer")} <ArrowRight size={14} /></p>
              </Card>
            </button>
          ))}
        </div>
      </section>

      {/* EXAM OVERVIEW */}
      <section className={`${c.tint} border-y ${c.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <SectionHead eyebrow={t("L'épreuve en bref")} title={t("Comprendre le TCF Canada")} sub={t("Un test unique, quatre épreuves obligatoires, un score sur 699 points converti en niveaux NCLC pour votre dossier IRCC.")} />
            <div className="space-y-3">
              {MOCK_SECTIONS.map((s) => (
                <div key={s.t} className={`flex items-center gap-4 p-4 rounded-2xl border ${c.border} ${c.card}`}>
                  <span className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><s.icon size={18} /></span>
                  <div className="flex-1"><p className={`font-semibold text-sm ${c.text}`}>{t(s.t)}</p><p className={`text-xs font-mono2 ${c.faint}`}>{t(s.d)}</p></div>
                  <ChevronRight size={16} className={c.faint} />
                </div>
              ))}
            </div>
          </div>
          <Card className="p-7 md:p-9">
            <h3 className={`font-display font-bold text-xl ${c.text} mb-6`}>{t("Pourquoi nous choisir")}</h3>
            <div className="space-y-6">
              {WHY.map((w) => (
                <div key={w.t} className="flex gap-4">
                  <span className="w-10 h-10 rounded-xl bg-rose-600/10 text-rose-600 flex items-center justify-center shrink-0"><w.icon size={18} /></span>
                  <div><p className={`font-semibold ${c.text}`}>{t(w.t)}</p><p className={`text-sm mt-1 ${c.sub}`}>{t(w.d)}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* TESTIMONIALS / SUCCESS STORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
        <SectionHead center eyebrow={t("Histoires de réussite")} title={t("Ils ont obtenu leur niveau. À vous maintenant.")} />
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((tm) => (
            <Card key={tm.name} lift className="p-6 flex flex-col">
              <Quote size={22} className="text-blue-600/40" aria-hidden="true" />
              <p className={`mt-4 text-sm leading-relaxed flex-1 ${c.text}`}>« {t(tm.text)} »</p>
              <div className="mt-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full grad-brand text-white text-sm font-bold flex items-center justify-center">{tm.name[0]}</span>
                <div className="flex-1"><p className={`text-sm font-bold ${c.text}`}>{tm.name}</p><p className={`text-xs ${c.faint}`}>{tm.from}</p></div>
                <Pill tone="green">{t(tm.level)}</Pill>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className={`${c.tint} border-y ${c.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24">
          <SectionHead center eyebrow={t("Tarifs")} title={t("Commencez gratuitement, progressez en Premium")} sub={t("Sans engagement. Annulable en deux clics. Garantie 30 jours sur l'abonnement annuel.")} />
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {plans.map((p) => <PlanCard key={p.name} p={p} compact />)}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
        <h2 className={`font-display font-extrabold text-3xl md:text-5xl ${c.text}`}>{t("Votre passerelle vers le Canada")}<br /><span className="grad-text">{t("commence aujourd'hui.")}</span></h2>
        <p className={`mt-5 text-lg ${c.sub}`}>{t("Un quiz complet gratuit dans chaque épreuve. Aucune carte bancaire requise.")}</p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Btn variant="accent" icon={ArrowRight} onClick={() => nav("register")}>{t("Créer mon compte gratuit")}</Btn>
        </div>
      </section>
    </main>
  );
}
