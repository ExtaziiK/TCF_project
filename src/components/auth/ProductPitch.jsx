import { ArrowRight, CheckCircle2, ClipboardCheck, Timer, Trophy, Sparkles, Save, GraduationCap, BookOpen, Headphones, PenLine, Languages, SpellCheck, NotebookPen, ListChecks, Crown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, RouteLink } from "@/components/common";
import { MockPass } from "@/components/home/ToolsShowcase";
import { EpreuveCards } from "@/components/home/ExamOverview";
import { DemoQuestion } from "@/components/home/DemoQuestion";
import { DemoQuestionCE } from "@/components/home/DemoQuestionCE";
import { MOCKS } from "@/components/home/ToolMocks";
import { PALETTE, TOOLS } from "@/components/home/toolsData";
import { heroShot } from "@/components/home/heroShots";

// What a VISITOR sees on the three « Produit » pages of the navbar — TCF
// blanc, Épreuves, Exercices — which all need an account. They used to share
// one generic "create a free account" gate; each now makes its own case, from
// pieces the site already shows elsewhere: the app's real screens (the
// landing collage's captures), the TCF blanc boarding pass, the épreuve
// cards, the live demo questions and the tools' animated previews. Every page
// ends on the same two buttons: create a free account, or log in. Rendered by
// RouteGuard for reason "register" only (a free account that needs a forfait
// keeps the upgrade gate).
//
// Claims stay within what a free account really gets (see the Basic plan's
// `feats` in constants/pricing.js): one quiz per épreuve, one full TCF blanc
// with AI correction, one writing and one speaking subject with AI analysis,
// vocabulary and grammar lessons without limit.

function Actions({ center = false }) {
  const { t, nav, c } = useApp();
  return (
    <div className={center ? "flex flex-col items-center" : ""}>
      <div className={`flex flex-col sm:flex-row gap-3 ${center ? "justify-center" : ""}`}>
        <Btn variant="accent" icon={ArrowRight} onClick={() => nav("register")}>{t("Créer un compte gratuitement")}</Btn>
        <Btn variant="ghost" onClick={() => nav("login")}>{t("J'ai déjà un compte")}</Btn>
      </div>
      <p className={`mt-3 text-xs ${c.faint}`}>{t("Gratuit, sans carte bancaire — prêt en 30 secondes.")}</p>
    </div>
  );
}

// A screen of the app, as a flat slab (outline + solid edge), like the
// landing collage — in the site's current theme.
function Shot({ name, className = "" }) {
  const { dark } = useApp();
  const edge = Array.from({ length: 6 }, (_, i) => `${i + 1}px ${i + 1}px 0 0 ${dark ? "#22314F" : "#8FA3C7"}`).join(", ");
  return (
    <img src={heroShot(name, dark)} alt="" draggable="false"
      className={`block w-full h-auto rounded-2xl ${className}`}
      style={{ border: `4px solid ${dark ? "#3B4A6B" : "#14204A"}`, boxShadow: edge }} />
  );
}

function SectionTitle({ eyebrow, title, sub }) {
  const { c, t } = useApp();
  return (
    <div className="mb-8">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{t(eyebrow)}</p>}
      <h2 className={`mt-2 font-display font-extrabold text-2xl md:text-3xl ${c.text}`}>{t(title)}</h2>
      {sub && <p className={`mt-2 text-sm md:text-base ${c.sub}`}>{t(sub)}</p>}
    </div>
  );
}

// Four points: icon, title, one line.
function Perks({ items }) {
  const { c, t } = useApp();
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((p) => (
        <div key={p.t} className={`rounded-3xl border p-5 ${c.border} ${c.card}`}>
          <p.icon size={22} className={c.sub} aria-hidden="true" />
          <p className={`mt-3 font-display font-bold ${c.text}`}>{t(p.t)}</p>
          <p className={`mt-1 text-sm leading-relaxed ${c.sub}`}>{t(p.d)}</p>
        </div>
      ))}
    </div>
  );
}

// The page: hero (pitch + a real screen), the page's own sections, its four
// points, and a closing call to action.
function PitchLayout({ eyebrow, title, sub, shot, children, perks, closing }) {
  const { c, t } = useApp();
  return (
    <main className="pt-28 md:pt-32 pb-20">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{t(eyebrow)}</p>
          <h1 className={`mt-3 font-display font-extrabold text-4xl md:text-5xl leading-[1.08] ${c.text}`}>{t(title)}</h1>
          <p className={`mt-5 text-base md:text-lg leading-relaxed ${c.sub}`}>{t(sub)}</p>
          <div className="mt-7"><Actions /></div>
        </div>
        <div className="lg:pl-4"><Shot name={shot} /></div>
      </section>
      {children}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <SectionTitle eyebrow="Avec un compte gratuit" title="Ce que vous obtenez" />
        <Perks items={perks} />
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 mt-20 text-center">
        <h2 className={`font-display font-extrabold text-2xl md:text-3xl ${c.text}`}>{t(closing)}</h2>
        <div className="mt-6"><Actions center /></div>
      </section>
    </main>
  );
}

// ── TCF blanc ────────────────────────────────────────────────────────────────

const MOCK_STEPS = [
  { icon: ClipboardCheck, t: "Créez votre compte", d: "30 secondes, sans carte bancaire. Votre premier TCF blanc complet est offert." },
  { icon: Timer, t: "Enchaînez les quatre épreuves", d: "2 h 47 minutées comme le jour J. Faites une pause quand vous voulez : la progression est sauvegardée." },
  { icon: Trophy, t: "Recevez votre résultat", d: "Un score sur 699 par épreuve, converti en NCLC, et la correction IA de votre écrit et de votre oral." },
];

export function MocksPitch() {
  const { c, t, dark } = useApp();
  return (
    <PitchLayout eyebrow="TCF blanc" title="Passez un vrai TCF blanc, gratuitement" shot="tcf-blanc"
      sub="Les quatre épreuves enchaînées en conditions réelles : minutées, notées sur 699 et converties en niveaux NCLC. Chaque examen est tiré au hasard dans la banque, jamais deux fois le même."
      closing="Votre premier TCF blanc vous attend"
      perks={[
        { icon: ClipboardCheck, t: "1 TCF blanc complet", d: "Les quatre épreuves, correction IA incluse." },
        { icon: Trophy, t: "Score sur 699", d: "Et son équivalence en niveaux NCLC pour IRCC." },
        { icon: Sparkles, t: "Correction par IA", d: "Niveau, erreurs et version améliorée de votre écrit et de votre oral." },
        { icon: Save, t: "Progression sauvegardée", d: "Interrompez, reprenez là où vous en étiez." },
      ]}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <SectionTitle eyebrow="Le déroulé" title="Comment se passe un TCF blanc" />
        <ol className="grid md:grid-cols-3 gap-4">
          {MOCK_STEPS.map((s, i) => (
            <li key={s.t} className={`rounded-3xl border p-6 ${c.border} ${c.card}`}>
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-9 h-9 rounded-full font-display font-extrabold text-sm text-white" style={{ background: "#2E6BE6" }}>{i + 1}</span>
                <s.icon size={20} className={c.sub} aria-hidden="true" />
              </div>
              <p className={`mt-4 font-display font-bold text-lg ${c.text}`}>{t(s.t)}</p>
              <p className={`mt-1.5 text-sm leading-relaxed ${c.sub}`}>{t(s.d)}</p>
            </li>
          ))}
        </ol>
        {/* The pass's cut-out notches take the page colour: the app background is
            the "tinted" one in light mode, the plain one in dark mode. */}
        <MockPass tinted={!dark} cta={{ l: "Créer mon compte", r: "register" }} />
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <SectionTitle eyebrow="Après l'examen" title="Votre résultat, converti en NCLC"
            sub="Le score de chaque épreuve est traduit en niveau NCLC, celui que demande IRCC pour Entrée express et la citoyenneté. Vous savez où vous en êtes, et ce qu'il reste à gagner." />
          <RouteLink r="calculator" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:gap-3 transition-all">
            {t("Essayer le calculateur NCLC")} <ArrowRight size={15} />
          </RouteLink>
        </div>
        <Shot name="calculator" />
      </section>
    </PitchLayout>
  );
}

// ── Épreuves ─────────────────────────────────────────────────────────────────

export function ExamsPitch() {
  return (
    <PitchLayout eyebrow="Épreuves" title="Les quatre épreuves du TCF Canada, au format officiel" shot="epreuves"
      sub="40 quiz en compréhension orale, 40 en compréhension écrite, et les tâches d'expression écrite et orale corrigées par l'IA. Le premier quiz de chaque épreuve est offert."
      closing="Commencez par le premier quiz de chaque épreuve"
      perks={[
        { icon: GraduationCap, t: "Un quiz par épreuve", d: "Le premier quiz de chaque épreuve, au format officiel." },
        { icon: Sparkles, t: "Écrit et oral corrigés", d: "Un sujet d'expression écrite et un d'orale, avec analyse IA." },
        { icon: CheckCircle2, t: "Réponses expliquées", d: "Chaque question corrigée, avec son explication." },
        { icon: Save, t: "Suivi de progression", d: "Vos scores et vos signets, gardés d'une séance à l'autre." },
      ]}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <SectionTitle eyebrow="Le format" title="Quatre épreuves, une seule plateforme" />
        <EpreuveCards to="register" cta="Commencer" />
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <SectionTitle eyebrow="Démo interactive" title="Essayez deux vraies questions"
          sub="Écoutez ou lisez le document, puis cliquez sur une réponse : la correction s'affiche aussitôt." />
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <DemoQuestion />
          <DemoQuestionCE />
        </div>
      </section>
    </PitchLayout>
  );
}

// ── Exercices ────────────────────────────────────────────────────────────────

// The notebook's six tools, as listed in the Exercices hub.
const NOTEBOOK = [
  { icon: PenLine, l: "La dictée", d: "Un corrigé C1 écrit mot à mot, corrigé aussitôt", paid: true },
  { icon: BookOpen, l: "Vocabulaire", d: "Cartes par thème : immigration, travail, vie quotidienne" },
  { icon: SpellCheck, l: "Grammaire", d: "Leçons courtes suivies d'exercices" },
  { icon: Languages, l: "Conjugaison", d: "Les temps du TCF, leçon puis exercices" },
  { icon: NotebookPen, l: "Carnet d'erreurs", d: "Vos fautes, regroupées pour les retravailler" },
  { icon: ListChecks, l: "Révision", d: "Les questions manquées, en séances ciblées", paid: true },
];
const PREVIEWS = ["dictee", "vocabulary", "grammar"];

export function ExercicesPitch() {
  const { c, t, dark } = useApp();
  return (
    <PitchLayout eyebrow="Exercices" title="Votre cahier d'entraînement" shot="dictee"
      sub="La dictée, le vocabulaire, la grammaire et la conjugaison réunis dans un seul cahier, pour combler vos lacunes entre deux épreuves."
      closing="Ouvrez votre cahier d'entraînement"
      perks={[
        { icon: BookOpen, t: "Vocabulaire et grammaire", d: "Cartes et leçons sans limite." },
        { icon: Languages, t: "Conjugaison", d: "Leçons illimitées, 10 minutes d'exercices par jour." },
        { icon: Headphones, t: "Un quiz par épreuve", d: "Pour situer votre niveau dès le départ." },
        { icon: Crown, t: "La dictée et la révision", d: "Incluses dans les accès payants." },
      ]}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <SectionTitle eyebrow="En action" title="Trois outils, en un coup d'œil" />
        <div className="grid lg:grid-cols-3 gap-5">
          {PREVIEWS.map((r) => {
            const tool = TOOLS.find((x) => x.route === r);
            const [, ink, soft] = PALETTE[tool.tone][dark ? "dark" : "light"];
            const Mock = MOCKS[r];
            return (
              <div key={r} className={`flex flex-col rounded-[28px] border-2 p-5 ${c.card}`} style={{ borderColor: ink }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="grid place-items-center w-10 h-10 rounded-xl text-white" style={{ background: ink }}><tool.icon size={18} /></span>
                  <p className={`font-display font-bold ${c.text}`}>{t(tool.t)}</p>
                </div>
                <div aria-hidden="true" className="flex-1 flex flex-col"><Mock ink={ink} soft={soft} /></div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <SectionTitle eyebrow="Le cahier" title="Six outils, un seul cahier" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {NOTEBOOK.map((n) => (
            <div key={n.l} className={`flex items-start gap-3 rounded-3xl border p-5 ${c.border} ${c.card}`}>
              <n.icon size={22} className={`shrink-0 mt-0.5 ${c.sub}`} aria-hidden="true" />
              <div>
                <p className={`font-display font-bold ${c.text}`}>
                  {t(n.l)}
                  {n.paid && <span className="ml-2 align-middle px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-400 text-slate-900">{t("Premium")}</span>}
                </p>
                <p className={`mt-1 text-sm leading-relaxed ${c.sub}`}>{t(n.d)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PitchLayout>
  );
}
