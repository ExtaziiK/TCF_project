import { Leaf, ArrowRight, ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn, SectionHead, StarRating } from "@/components/common";
import { DemoQuestion } from "@/components/home/DemoQuestion";
import { DemoQuestionCE } from "@/components/home/DemoQuestionCE";
import { HomeLabel } from "@/components/home/HomeLabel";
import { VideoTutorial } from "@/components/home/VideoTutorial";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { ScoreCalculator } from "@/components/calculator/ScoreCalculator";
import { MemberHome } from "@/components/dashboard/MemberHome";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { FEATURES, WHY } from "@/constants/home";
import { usePricingSelection } from "@/hooks/usePricingSelection";
import { useHomeStats } from "@/hooks/useHomeStats";
import { useTestimonials } from "@/hooks/useTestimonials";
import { useRatingSummary } from "@/hooks/useRatingSummary";
import { MOCK_SECTIONS } from "@/constants/mocks";

// Logged-in users land on their personal dashboard; the marketing landing
// below is for signed-out traffic — and for staff who asked to see it, via the
// logo (see VisitorPreviewBar). That preview leaves them signed in: it changes
// which page renders here, not who they are.
export function Home() {
  const { user, authReady, visitorPreview } = useApp();
  if (!authReady) return null; // avoid a landing flash while the session loads
  if (user && !visitorPreview) return <MemberHome />;
  return <Landing />;
}

function Landing() {
  const { c, nav, t } = useApp();
  const pricing = usePricingSelection();
  const stats = useHomeStats();
  const testimonials = useTestimonials();
  const rating = useRatingSummary(); // null until there are enough ratings to mean anything
  return (
    <main>
      {/* HERO — the nav-clearance padding lives on the section (not <main>) so
          its background starts at the very top, right under the banner, with no
          plain strip; the inner content stays below the fixed nav. */}
      <section className="relative overflow-hidden pt-16 md:pt-[72px]">
        {/* Symmetric brand glows so the top tint spans the full width evenly
            (blue on the left, red on the right) instead of a lopsided corner. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-24 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: "radial-gradient(circle,#2E6BE6,transparent 65%)" }} />
          <div className="absolute -top-40 -right-24 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: "radial-gradient(circle,#D8354A,transparent 65%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-16 relative">
          {/* admin-editable announcement, shown to logged-out visitors */}
          <HomeLabel />
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

          {/* below: the CO and CE daily questions side by side — blue CO on
              the left, rose CE on the right (same accent split the bonus
              question used to provide). */}
          {/* items-center: when answering extends one card (explanation shown),
              the shorter one stays vertically centred beside it. */}
          <div className="mt-14 md:mt-16 grid lg:grid-cols-2 gap-6 items-center">
            <div className="rise rise-2"><DemoQuestion /></div>
            <div className="rise rise-3"><DemoQuestionCE /></div>
          </div>
        </div>
      </section>

      {/* STATS — admin-toggleable (Admin › Accueil › Statistique). Numbers are
          real: content counts are computed from the shipped bank, the student
          count is read from the database on load, site counts are the last
          figures an admin published from the live database. */}
      {stats?.enabled && stats.items.length > 0 && (
        <section className={`border-y ${c.border} ${c.tint}`}>
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 gap-8 ${stats.items.length % 3 === 0 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
            {stats.items.map((s) => (
              <div key={s.key} className="text-center">
                <p className="font-display font-extrabold text-3xl md:text-4xl grad-text">{s.value}</p>
                <p className={`mt-1.5 text-sm ${c.sub}`}>{t(s.label)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
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

      {/* TUTORIAL VIDEO — between the four épreuves and the exam overview */}
      <VideoTutorial />

      {/* EXAM OVERVIEW */}
      <section className={`${c.tint} border-y ${c.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20 grid lg:grid-cols-2 gap-12 items-center">
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

      {/* TESTIMONIALS / SUCCESS STORIES — written by members, published only
          once an admin approves them (Admin › Témoignages). Falls back to the
          three seed stories until the table has approved content, and the whole
          block can be switched off from Admin › Accueil › Témoignages — heading
          and invitation included, so hiding it leaves nothing dangling. */}
      {testimonials?.enabled && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <SectionHead center eyebrow={t("Histoires de réussite")} title={t("Ils ont obtenu leur niveau. À vous maintenant.")} />
          {/* The site-wide score, over every approved review rather than the
              six shown below — the same figure the avis page prints. */}
          {rating && (
            <div className="flex flex-wrap items-center justify-center gap-3 -mt-2 mb-8">
              <StarRating value={Math.round(rating.average)} size={20} />
              <p className={`text-sm ${c.sub}`}>
                <span className={`font-display font-bold text-lg ${c.text}`}>{rating.average.toLocaleString("fr-CA")}</span>
                {" / 5 · "}
                <button onClick={() => nav("avis")} className="font-semibold text-blue-600 hover:underline">
                  {rating.count} {t("avis")}
                </button>
              </p>
            </div>
          )}
          <TestimonialsCarousel items={testimonials.items} />
          <p className={`mt-8 text-center text-sm ${c.sub}`}>
            {t("Vous avez passé le TCF avec Passerelle ?")}{" "}
            <button onClick={() => nav("register")} className="font-semibold text-blue-600 hover:underline">{t("Partagez votre histoire")}</button>
          </p>
        </section>
      )}

      {/* NCLC CALCULATOR */}
      <section id="calculateur" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <SectionHead center eyebrow={t("Calculateur")} title={t("Convertissez vos scores en niveaux NCLC")} sub={t("Entrez vos scores TCF Canada et vérifiez si vous atteignez les seuils de votre projet d'immigration.")} />
        <div className="max-w-5xl mx-auto"><ScoreCalculator /></div>
      </section>

      {/* PRICING PREVIEW */}
      <section className={`${c.tint} border-y ${c.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <SectionHead center eyebrow={t("Tarifs")} title={t("Commencez gratuitement, progressez en Premium")} sub={t("Choisissez votre devise, appliquez votre code promo, et payez par carte ou en dinars — sans créer de compte pour regarder.")} />
          {/* Same block as the Tarifs page: currency switch, plans, promo field.
              All of it works signed out — only the purchase itself needs an
              account, and the code entered here survives that signup. */}
          <PricingPlans s={pricing} compact />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14 md:py-20 text-center">
        <h2 className={`font-display font-extrabold text-3xl md:text-5xl ${c.text}`}>{t("Votre passerelle vers le Canada")}<br /><span className="grad-text">{t("commence aujourd'hui.")}</span></h2>
        <p className={`mt-5 text-lg ${c.sub}`}>{t("Un quiz complet gratuit dans chaque épreuve. Aucune carte bancaire requise.")}</p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Btn variant="accent" icon={ArrowRight} onClick={() => nav("register")}>{t("Créer mon compte gratuit")}</Btn>
        </div>
      </section>
    </main>
  );
}
