import { ArrowRight, CheckCircle2, ClipboardCheck, Timer, Trophy, Sparkles, Save, GraduationCap, BookOpen, Headphones, PenLine, Languages, SpellCheck, NotebookPen, ListChecks, Crown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, RouteLink } from "@/components/common";
import { MockPass } from "@/components/home/ToolsShowcase";
import { EpreuveCards } from "@/components/home/ExamOverview";
import { DemoQuestion } from "@/components/home/DemoQuestion";
import { DemoQuestionCE } from "@/components/home/DemoQuestionCE";
import { PALETTE } from "@/components/home/toolsData";
import { heroShot } from "@/components/home/heroShots";

// What a VISITOR sees on the three « Produit » pages of the navbar — TCF
// blanc, Épreuves, Exercices — which all need an account. They used to share
// one generic "create a free account" gate; each now makes its own case, from
// pieces the site already shows elsewhere: the app's real screens (the
// landing collage's captures), the TCF blanc boarding pass, the épreuve
// cards, the live demo questions and the notebook's tools. Every page
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

// The notebook's six tools, each in its colour in the Exercices hub
// (pages/Pratique.jsx) and with a small illustration of what it does.
const NOTEBOOK = [
  { icon: PenLine, tone: "navy", l: "La dictée", d: "Un corrigé C1 écrit mot à mot, corrigé aussitôt", paid: true, demo: "dictee" },
  { icon: BookOpen, tone: "mint", l: "Vocabulaire", d: "Cartes par thème : immigration, travail, vie quotidienne", demo: "vocab" },
  { icon: SpellCheck, tone: "fuchsia", l: "Grammaire", d: "Leçons courtes suivies d'exercices", demo: "grammar" },
  { icon: Languages, tone: "cyan", l: "Conjugaison", d: "Les temps du TCF, leçon puis exercices", demo: "conj" },
  { icon: NotebookPen, tone: "amber", l: "Carnet d'erreurs", d: "Vos fautes, regroupées pour les retravailler", demo: "carnet" },
  { icon: ListChecks, tone: "rose", l: "Révision", d: "Les questions manquées, en séances ciblées", paid: true, demo: "revision" },
];

// The little picture at the foot of each tool's card — the tool's own
// content in miniature, in its colours. Illustrations: French on purpose.
function ToolDemo({ kind, ink, soft }) {
  const { c } = useApp();
  const chip = "rounded-lg px-2 py-1 text-xs font-semibold";
  if (kind === "dictee") {
    return (
      <p className={`font-mono2 text-xs leading-relaxed ${c.sub}`}>
        Les candidats qui se sont <span className="line-through decoration-2" style={{ textDecorationColor: "#D8354A" }}>préparé</span>{" "}
        <span className="font-bold rounded px-1" style={{ background: soft, color: ink }}>préparés</span> régulièrement…
      </p>
    );
  }
  if (kind === "vocab") {
    return (
      <div className="flex items-center gap-2">
        <span className={`${chip} border-2`} style={{ borderColor: ink, color: ink }}>le permis de travail</span>
        <span className={`${chip}`} style={{ background: soft, color: ink }}>Je sais ✓</span>
      </div>
    );
  }
  if (kind === "grammar") {
    return (
      <p className={`text-sm ${c.text}`}>
        Il faut que tu <span className="font-bold border-b-2 px-1" style={{ borderColor: ink, color: ink }}>viennes</span> demain.
      </p>
    );
  }
  if (kind === "conj") {
    return (
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {[["je", "viens"], ["tu", "viens"], ["il", "vient"]].map(([p, v]) => (
          <span key={p} className={`${chip}`} style={{ background: soft, color: ink }}>{p} <b>{v}</b></span>
        ))}
      </div>
    );
  }
  if (kind === "carnet") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {[["Accords", 3], ["Accents", 2], ["Prépositions", 1]].map(([l, n]) => (
          <span key={l} className={`${chip}`} style={{ background: soft, color: ink }}>{l} ×{n}</span>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: soft }}>
        <div className="h-full w-2/3 rounded-full" style={{ background: ink }} />
      </div>
      <span className="font-mono2 text-[11px] font-bold" style={{ color: ink }}>8 / 12 revues</span>
    </div>
  );
}

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
        <SectionTitle eyebrow="Le cahier" title="Six outils, un seul cahier"
          sub="Chaque outil a son marque-page et sa couleur, comme dans votre espace." />
        {/* Drawn as a notebook: a neutral sheet with a binding down its left
            edge, and the tools as cards with a coloured tab, their icon and a
            miniature of what they do. */}
        <div className={`relative rounded-[28px] border-2 pl-10 sm:pl-14 pr-4 sm:pr-6 py-6 ${c.card} ${c.border}`}>
          <div aria-hidden="true" className="absolute left-3 sm:left-5 top-6 bottom-6 flex flex-col justify-around">
            {Array.from({ length: 9 }, (_, i) => <span key={i} className={`w-3 h-3 rounded-full border-2 ${c.border}`} />)}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NOTEBOOK.map((n) => {
              const [, ink, soft] = PALETTE[n.tone][dark ? "dark" : "light"];
              return (
                <div key={n.l} className={`flex flex-col rounded-2xl border-2 border-l-[6px] p-5 ${c.card}`} style={{ borderColor: `${ink}44`, borderLeftColor: ink }}>
                  <div className="flex items-center gap-3">
                    <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0" style={{ background: soft, color: ink }}><n.icon size={19} /></span>
                    <p className={`font-display font-bold ${c.text}`}>
                      {t(n.l)}
                      {n.paid && <span className="ml-2 align-middle px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-400 text-slate-900">{t("Premium")}</span>}
                    </p>
                  </div>
                  <p className={`mt-2 text-sm leading-relaxed flex-1 ${c.sub}`}>{t(n.d)}</p>
                  <div aria-hidden="true" className={`mt-4 pt-4 border-t border-dashed ${c.border}`}><ToolDemo kind={n.demo} ink={ink} soft={soft} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PitchLayout>
  );
}
