import { ArrowRight, MousePointerClick } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Pill, Btn, SectionHead, StarRating, RouteLink } from "@/components/common";
import { HomeLabel } from "@/components/home/HomeLabel";
import { VideoTutorial } from "@/components/home/VideoTutorial";
import { CountUp } from "@/components/home/CountUp";
import { ToolsShowcase } from "@/components/home/ToolsShowcase";
import { HeroCollage } from "@/components/home/HeroCollage";
import { ExamOverview } from "@/components/home/ExamOverview";
import { WHY } from "@/constants/home";
import { Sparks, MapleMark, CurvedArrow } from "@/components/home/TitleDoodles";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { ScoreCalculator } from "@/components/calculator/ScoreCalculator";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { SaleStrip } from "@/components/pricing/SaleBanner";
import { SectionDecor } from "@/components/decor/SectionDecor";
import { WaveSection, TINT } from "@/components/decor/WaveSection";
import { usePricingSelection } from "@/hooks/usePricingSelection";
import { useHomeStats } from "@/hooks/useHomeStats";
import { useTestimonials } from "@/hooks/useTestimonials";
import { useRatingSummary } from "@/hooks/useRatingSummary";

// Logged-in users land on their personal dashboard; the marketing landing
// below is for signed-out traffic — and for staff who asked to see it, via the
// logo (see VisitorPreviewBar). That preview leaves them signed in: it changes
// which page renders here, not who they are.
export function Home() {
  const { user, authReady, visitorPreview } = useApp();
  if (!authReady) return null; // avoid a landing flash while the session loads
  // Signed in, they belong on the dashboard and AppProvider is already sending
  // them there — rendering the landing page for that one frame would show a
  // "Créez un compte gratuit" pitch to someone who has an account.
  if (user && !visitorPreview) return null;
  return <Landing />;
}

function Landing() {
  const { c, nav, t, dark } = useApp();
  const pricing = usePricingSelection();
  const stats = useHomeStats();
  const testimonials = useTestimonials();
  const rating = useRatingSummary(); // null until there are enough ratings to mean anything
  // After the tinted hero (which now holds the tools showcase), sections
  // alternate plain (opening with a wave, shape and direction varied) and
  // tinted (straight edge), starting plain. Counted over the blocks actually
  // shown, so hiding testimonials never puts two tints together. Order: video
  // 0, testimonials 1, overview 2, calculator 3, pricing 4, CTA 5.
  const showTestimonials = !!testimonials?.enabled;
  const look = (n) => {
    const i = (n <= 1 || showTestimonials ? n : n - 1) + 1;
    return i % 2 === 0 ? { tinted: true } : { wave: i % 4 === 1 ? 1 : 0, flip: i % 4 === 1 };
  };
  return (
    <main>
      {/* HERO — the nav-clearance padding lives on the section (not <main>) so
          its background starts at the very top, right under the banner, with no
          plain strip; the inner content stays below the fixed nav. */}
      <section className="relative overflow-hidden pt-16 md:pt-[72px]" style={{ background: dark ? TINT.dark : TINT.light }}>
        {/* Symmetric brand glows so the top tint spans the full width evenly
            (blue on the left, red on the right) instead of a lopsided corner. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-24 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: "radial-gradient(circle,#2E6BE6,transparent 65%)" }} />
          <div className="absolute -top-40 -right-24 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: "radial-gradient(circle,#D8354A,transparent 65%)" }} />
        </div>
        <SectionDecor variant="hero" from="md" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-16 relative">
          {/* admin-editable announcement, shown to logged-out visitors */}
          <HomeLabel />
          {/* A running sale (api/_lib/sale.js), with its countdown; gone by itself at the end. */}
          <div className="flex justify-center"><SaleStrip /></div>
          {/* top: the pitch, and from lg the 3D collage of real screens beside
              it (Brevo-style). Centered while it is alone (below lg). */}
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-10 xl:gap-14 items-center">
            <div className="max-w-3xl mx-auto lg:mx-0 text-center lg:text-left">
              {/* Doodles from the reference design: sparks at the top-left
                  corner, a maple-leaf outline after "TCF Canada", and an arrow
                  curving toward the collage (lg+, where the collage is). */}
              <h1 className={`relative font-display font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-[3.4rem] xl:text-6xl leading-[1.05] ${c.text} rise rise-1`}>
                <Sparks className="hidden md:block absolute -left-11 -top-7 w-11 h-11" />
                {t("La plateforme complète pour se préparer au")} <span className="grad-text">{t("TCF Canada")}</span>
                <MapleMark className="inline-block w-[0.8em] h-[0.74em] ml-[0.25em] align-[-0.06em]" />
                <CurvedArrow className="hidden lg:block absolute -right-10 -bottom-4 w-14 h-8" />
              </h1>
              <p className={`mt-6 text-lg md:text-xl leading-relaxed ${c.sub} rise rise-2`}>
                {t("Les 4 épreuves du TCF Canada : des questions au format officiel, des TCF blancs notés, une correction par IA de vos textes et de votre oral, et un suivi continu.")}
              </p>
              <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3 rise rise-3">
                <Btn variant="accent" icon={ArrowRight} onClick={() => nav("practice")}>{t("Commencer à pratiquer gratuitement")}</Btn>
              </div>
            </div>
            <div className="rise rise-2"><HeroCollage /></div>
          </div>

          {/* STATS — admin-toggleable (Admin › Accueil › Statistique), between
              the pitch and the demo. Numbers are real: content counts are
              computed from the shipped bank, the student count is read from the
              database on load, site counts are the last figures an admin
              published from the live database. */}
          {stats?.enabled && stats.items.length > 0 && (
            <div className={`mt-12 md:mt-14 grid grid-cols-2 gap-8 ${stats.items.length % 3 === 0 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
              {stats.items.map((s) => (
                <div key={s.key} className="text-center">
                  <p className="font-display font-extrabold text-3xl md:text-4xl grad-text"><CountUp value={s.value} /></p>
                  <p className={`mt-1.5 text-sm ${c.sub}`}>{t(s.label)}</p>
                </div>
              ))}
            </div>
          )}

          {/* WHY US — under the figures: one row of four short points, each a
              brand-colour icon, a bold title and a single line. The long
              versions live on the "À propos" page. */}
          <div className="mt-12 md:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 rise rise-3">
            {WHY.map((w, i) => (
              <div key={w.t} className="flex items-start gap-3">
                <span className="grid place-items-center w-11 h-11 rounded-2xl shrink-0 text-white"
                  style={{ background: ["#2E6BE6", "#6C4FE0", "#D8354A", "#F59E0B"][i % 4] }}>
                  <w.icon size={20} />
                </span>
                <div>
                  <p className={`font-display font-bold leading-snug ${c.text}`}>{t(w.t)}</p>
                  <p className={`mt-0.5 text-sm leading-snug ${c.sub}`}>{t(w.short)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* below: the tools showcase, live — its Compréhension orale and
              Compréhension écrite panels are real bank questions (the two demo
              cards that used to sit here), the other tools are previews. The
              heading says it is interactive and needs no account; without it
              the panels read as screenshots. */}
          <div className="mt-14 md:mt-16 text-center rise rise-2">
            <Pill tone="blue"><MousePointerClick size={12} /> {t("Démo interactive")}</Pill>
            <h2 className={`font-display font-bold text-2xl md:text-3xl mt-3 ${c.text}`}>{t("Les outils à votre disposition")}</h2>
          </div>
          <div className="mt-8 rise rise-3"><ToolsShowcase tinted /></div>
        </div>
      </section>

      {/* The hero (with the stats) is one tinted block; the page then alternates
          plain and tinted sections. A single wide wave opens a plain section
          after a tinted one, only a few times down the page; the other
          boundaries stay straight. */}
      {/* TUTORIAL VIDEO — its own tinted block, so it reads as separate from
          the module cards above (VideoTutorial only pads its bottom). */}
      <WaveSection {...look(0)} decor="video">
        <div className="pt-14 md:pt-20"><VideoTutorial /></div>
      </WaveSection>

      {/* TESTIMONIALS / SUCCESS STORIES — written by members, published only
          once an admin approves them (Admin › Avis). Falls back to the
          three seed stories until the table has approved content, and the whole
          block can be switched off from Admin › Accueil › Avis — heading
          and invitation included, so hiding it leaves nothing dangling. */}
      {testimonials?.enabled && (
        <WaveSection {...look(1)} decor="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <SectionHead center eyebrow={t("Histoires de réussite")} title={t("Ils ont obtenu leur niveau. À vous maintenant.")} />
          {/* The site-wide score, over every approved review rather than the
              six shown below — the same figure the avis page prints. The review
              count is deliberately left off the landing page. */}
          {rating && (
            <div className="flex flex-wrap items-center justify-center gap-3 -mt-2 mb-8">
              <StarRating value={Math.round(rating.average)} size={20} />
              <p className={`text-sm ${c.sub}`}>
                <span className={`font-display font-bold text-lg ${c.text}`}>{rating.average.toLocaleString("fr-CA")}</span>
                {" / 5 · "}
                <button onClick={() => nav("avis")} className="font-semibold text-blue-600 hover:underline">
                  {t("Lire les avis des candidats")}
                </button>
              </p>
            </div>
          )}
          <TestimonialsCarousel items={testimonials.items} />
          <p className={`mt-8 text-center text-sm ${c.sub}`}>
            {t("Vous avez passé le TCF avec Passerelle ?")}{" "}
            <button onClick={() => nav("register")} className="font-semibold text-blue-600 hover:underline">{t("Partagez votre histoire")}</button>
          </p>
        </div>
        </WaveSection>
      )}

      {/* EXAM OVERVIEW */}
      <WaveSection {...look(2)} decor="overview">
        <ExamOverview />
      </WaveSection>

      {/* NCLC CALCULATOR */}
      <WaveSection id="calculateur" {...look(3)} decor="calculator">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <SectionHead center eyebrow={t("Calculateur")} title={t("Convertissez vos scores en niveaux NCLC")} sub={t("Entrez vos scores TCF Canada et vérifiez si vous atteignez les seuils de votre projet d'immigration.")} />
          <div className="max-w-5xl mx-auto"><ScoreCalculator /></div>
        </div>
      </WaveSection>

      {/* PRICING PREVIEW */}
      <WaveSection {...look(4)} decor="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <SectionHead center eyebrow={t("Tarifs")} title={t("Commencez gratuitement, progressez en Premium")} sub={t("Choisissez votre devise, appliquez votre code promo, et payez par carte ou en dinars — sans créer de compte pour regarder.")} />
          {/* Same block as the Tarifs page: currency switch, plans, promo field.
              All of it works signed out — only the purchase itself needs an
              account, and the code entered here survives that signup. */}
          <PricingPlans s={pricing} compact />
          {/* This block is a PREVIEW — four differences per card, enough to
              compare prices and pick a direction — and until now it was also a
              dead end: nothing in it led to the full list of what each pass
              grants. The only route to /tarifs was the top nav, which is not
              where someone reading a pricing card is looking, so the visitor
              who wanted more detail had to go hunting for it or give up.
              A real <a href> (RouteLink), so it opens in a new tab like a link
              should and crawlers find /tarifs from the landing page. */}
          <div className="mt-10 flex justify-center">
            <RouteLink
              r="pricing"
              className={`group inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border font-bold text-sm transition ${c.border} ${c.card} ${c.hoverSoft} ${c.text}`}
            >
              {t("Comparer tous les forfaits en détail")}
              <ArrowRight size={16} className="text-blue-600 transition-transform group-hover:translate-x-0.5" />
            </RouteLink>
          </div>
        </div>
      </WaveSection>

      {/* FINAL CTA */}
      <WaveSection {...look(5)} decor="cta">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 md:py-20 text-center">
        <h2 className={`font-display font-extrabold text-3xl md:text-5xl ${c.text}`}>{t("Votre passerelle vers le Canada")}<br /><span className="grad-text">{t("commence aujourd'hui.")}</span></h2>
        <p className={`mt-5 text-lg ${c.sub}`}>{t("Un quiz complet gratuit dans chaque épreuve. Aucune carte bancaire requise.")}</p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Btn variant="accent" icon={ArrowRight} onClick={() => nav("register")}>{t("Créer mon compte gratuit")}</Btn>
        </div>
      </div>
      </WaveSection>
    </main>
  );
}
