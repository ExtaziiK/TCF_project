import { ArrowRight, CheckCircle2, CalendarDays, Lock, FileText, Mic, RefreshCw, Archive, ClipboardCheck, Timer, Trophy, Sparkles, Save, GraduationCap, BookOpen, Headphones, PenLine, Languages, SpellCheck, NotebookPen, ListChecks, Crown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, RouteLink } from "@/components/common";
import { MockPass } from "@/components/home/ToolsShowcase";
import { EpreuveCards } from "@/components/home/ExamOverview";
import { DemoQuestion } from "@/components/home/DemoQuestion";
import { DemoQuestionCE } from "@/components/home/DemoQuestionCE";
import { PALETTE } from "@/components/home/toolsData";
import { heroShot } from "@/components/home/heroShots";
import { STEPS as DICTEE_STEPS, FEATURES as DICTEE_FEATURES, TheDiagnosis } from "@/components/dictee/DicteePitch";
import { useLatestSujetsMonth, sujetsMonthLabel } from "@/services/sujetsLatestService";

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
// `feats` in constants/pricing.js): three quizzes per épreuve, one full TCF blanc
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
function Perks({ items, cols = "lg:grid-cols-4" }) {
  const { c, t } = useApp();
  return (
    <div className={`grid sm:grid-cols-2 ${cols} gap-4`}>
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
function PitchLayout({ eyebrow, title, sub, shot, visual, children, perks, closing, closingNote,
  perksEyebrow = "Avec un compte gratuit", perksTitle = "Ce que vous obtenez", perksCols }) {
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
        <div className="lg:pl-4">{visual || <Shot name={shot} />}</div>
      </section>
      {children}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <SectionTitle eyebrow={perksEyebrow} title={perksTitle} />
        <Perks items={perks} cols={perksCols} />
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 mt-20 text-center">
        <h2 className={`font-display font-extrabold text-2xl md:text-3xl ${c.text}`}>{t(closing)}</h2>
        {closingNote && <div className={`mt-3 text-sm ${c.sub}`}>{closingNote}</div>}
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
      sub="40 quiz en compréhension orale, 40 en compréhension écrite, et les tâches d'expression écrite et orale corrigées par l'IA. Les trois premiers quiz de chaque épreuve sont offerts."
      closing="Commencez par les trois premiers quiz de chaque épreuve"
      perks={[
        { icon: GraduationCap, t: "Trois quiz par épreuve", d: "Les trois premiers quiz de chaque épreuve, au format officiel." },
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
        { icon: Headphones, t: "Trois quiz par épreuve", d: "Pour situer votre niveau dès le départ." },
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

// ── La dictée ────────────────────────────────────────────────────────────────

// The visitors' version of the dictée's sales page, in the same format as the
// other product pages. Same copy and claims as the members' version
// (components/dictee/DicteePitch.jsx — see there for where each is enforced);
// a free account opening the dictée in its notebook still gets that one.
export function DicteeVisitorPitch() {
  const { c, t } = useApp();
  return (
    <PitchLayout eyebrow="La dictée · Premium" title="L'exercice qui vous dit d'où viennent vraiment vos fautes" shot="dictee"
      sub="Un corrigé de niveau C1 ou C2 lu à voix haute, que vous écrivez sans texte, sans correcteur et sans aide. Puis le compte exact de ce que vous avez entendu, et de ce que vous avez su écrire."
      perksEyebrow="Les détails" perksTitle="Une dictée faite comme il faut" perksCols="lg:grid-cols-3"
      perks={DICTEE_FEATURES}
      closing="La dictée fait partie des accès payants"
      closingNote={
        <>
          {t("Elle est incluse dans tous les forfaits, avec les TCF blancs chronométrés, les quatre-vingts quiz et la correction IA.")}{" "}
          <RouteLink r="pricing" className="font-semibold text-blue-600 hover:underline">{t("Voir les tarifs")}</RouteLink>
        </>
      }>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <SectionTitle eyebrow="Le déroulé" title="Écouter, écrire, comprendre" />
        <ol className="grid md:grid-cols-3 gap-4">
          {DICTEE_STEPS.map((s, i) => (
            <li key={s.t} className={`rounded-3xl border p-6 ${c.border} ${c.card}`}>
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-9 h-9 rounded-full font-display font-extrabold text-sm text-white" style={{ background: "#1F2E66" }}>{i + 1}</span>
                <s.icon size={20} className={c.sub} aria-hidden="true" />
              </div>
              <p className={`mt-4 font-display font-bold text-lg ${c.text}`}>{t(s.t)}</p>
              <p className={`mt-1.5 text-sm leading-relaxed ${c.sub}`}>{t(s.d)}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-20">
        <TheDiagnosis />
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <div className={`rounded-3xl border p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5 ${c.border} ${c.card}`}>
          <span className="grid place-items-center w-14 h-14 rounded-2xl shrink-0 font-display font-extrabold text-xl text-white" style={{ background: "#1F2E66" }}>+1</span>
          <div>
            <p className={`font-display font-bold text-lg ${c.text}`}>{t("Une nouvelle dictée chaque jour")}</p>
            <p className={`mt-1.5 text-sm leading-relaxed ${c.sub}`}>
              {t("Chaque nuit, un corrigé inédit est rédigé et enregistré pour chacune des trois tâches d'expression écrite. Et rien ne disparaît : tout ce qui a été écrit reste dans la bibliothèque, pour vous comme pour les autres. Plus vous revenez, plus il y en a.")}
            </p>
          </div>
        </div>
      </section>
    </PitchLayout>
  );
}

// ── Sujets du mois ───────────────────────────────────────────────────────────

// The hero's visual: an illustration of the month's page, not its content.
// The subjects — current month and archive alike — are for signed-in accounts
// only and are never requested for a visitor; the only real thing here is the
// month's name, which ships with the app (virtual:sujets-latest, read without
// any request: `useLatestSujetsMonth(false)`).
function SujetsTeaser() {
  const { c, t, lang } = useApp();
  const month = useLatestSujetsMonth(false);
  const label = sujetsMonthLabel(month, lang, t("Sujets du mois"));
  const pill = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.border} ${c.sub}`;
  // Placeholder lines, of varied lengths, standing in for the subjects.
  const lines = (widths) => widths.map((w, i) => <span key={i} className={`block h-2.5 rounded-full ${c.track}`} style={{ width: `${w}%` }} />);
  return (
    <div className={`rounded-3xl border-2 p-6 ${c.card}`} style={{ borderColor: "#6C4FE0" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={pill}><CalendarDays size={13} /> {label}{month ? ` ${month.year}` : ""}</span>
        <span className={pill}><FileText size={13} /> {t("Expression écrite")}</span>
        <span className={pill}><Mic size={13} /> {t("Expression orale")}</span>
      </div>
      <div aria-hidden="true" className="relative mt-6">
        <div className="space-y-6 blur-[3px] select-none">
          {[1, 2, 3].map((n) => (
            <div key={n}>
              <p className="font-mono2 text-xs font-bold uppercase tracking-widest" style={{ color: "#6C4FE0" }}>{t("Tâche")} {n}</p>
              <div className="mt-2 space-y-2">{lines(n === 1 ? [96, 88, 54] : n === 2 ? [92, 97, 81, 40] : [90, 84, 66])}</div>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-lg ${c.card} ${c.text}`}>
            <Lock size={15} /> {t("Créez un compte gratuit pour voir tous les sujets")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SujetsPitch() {
  const { c, t, nav } = useApp();
  return (
    <PitchLayout eyebrow="Sujets du mois" title="Les sujets qui tombent en ce moment au TCF Canada"
      sub="Chaque mois, les sujets d'expression écrite et orale qui circulent en session, rassemblés et classés par tâche, pour préparer en priorité ce qui vous attend."
      visual={<SujetsTeaser />}
      closing="Préparez les sujets de ce mois"
      perks={[
        { icon: CalendarDays, t: "Tous les sujets du mois", d: "Écrit et oral, dès qu'ils sont publiés." },
        { icon: Sparkles, t: "Entraînez-vous dessus", d: "Un sujet d'expression écrite et un d'orale, avec analyse IA." },
        { icon: Archive, t: "L'archive complète", d: "Les sujets des mois précédents, depuis 2022." },
        { icon: Crown, t: "Modèles de réponse", d: "Un modèle rédigé pour chaque sujet, avec un accès payant." },
      ]}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <SectionTitle eyebrow="Pourquoi les préparer" title="Ce qui vous attend le jour J" />
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, t: "Ce qui tombe en ce moment", d: "Les sujets qui circulent ce mois-ci, pas des sujets inventés : vous travaillez sur ce que d'autres candidats viennent de recevoir." },
            { icon: FileText, t: "Classés par tâche", d: "À l'écrit, des combinaisons de trois tâches comme à l'examen ; à l'oral, les tâches 2 et 3, partie par partie." },
            { icon: RefreshCw, t: "Mis à jour chaque mois", d: "Un nouveau mois remplace le précédent, qui rejoint l'archive. La liste reste toujours d'actualité." },
          ].map((x) => (
            <div key={x.t} className={`rounded-3xl border p-6 ${c.border} ${c.card}`}>
              <x.icon size={22} className={c.sub} aria-hidden="true" />
              <p className={`mt-3 font-display font-bold text-lg ${c.text}`}>{t(x.t)}</p>
              <p className={`mt-1.5 text-sm leading-relaxed ${c.sub}`}>{t(x.d)}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20">
        <div className={`rounded-3xl border-2 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 ${c.card}`} style={{ borderColor: "#6C4FE0" }}>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6C4FE0" }}>{t("Avec un compte gratuit")}</p>
            <p className={`mt-2 font-display font-extrabold text-2xl ${c.text}`}>{t("L'archive des anciens sujets")}</p>
            <p className={`mt-1.5 text-sm leading-relaxed ${c.sub}`}>{t("Tous les sujets des mois précédents, classés par année et par mois, pour vous entraîner sur ce qui est déjà tombé.")}</p>
          </div>
          <Btn variant="accent" icon={ArrowRight} onClick={() => nav("register")}>{t("Créer un compte gratuitement")}</Btn>
        </div>
      </section>
    </PitchLayout>
  );
}
