import { Crown, Ear, PenLine, Headphones, Gauge, Lock, Sparkles, ArrowRight, CheckCircle2, ScrollText } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";

// The dictée's sales page: what a visitor or a free account sees where the
// exercise itself would be.
//
// It exists because "Ce module fait partie de l'abonnement Premium" — the
// generic upgrade gate — says nothing about what is behind the door. The
// dictée is the one exercise on the site whose value is not obvious from its
// name: people know what a mock exam is worth, and nobody arrives knowing why
// a dictation would tell them anything about their French. So this page argues
// the case rather than announcing a paywall.
//
// Everything claimed here is enforced somewhere real:
//   • sense-group reading and the three lengths — api/_lib/dictee.js:splitGroups
//     and src/utils/dicteeSegments.js
//   • accents scored, punctuation and case ignored — src/utils/dicteeDiff.js
//   • no paste, no spellcheck, no autocomplete — NO_ASSIST_PROPS on the input
//   • one new text per tâche per night — api/cron/dictee-seed.js
// Marketing that outruns the code is a support ticket, so if any of those
// change, this copy changes with them.

const STEPS = [
  {
    icon: Headphones,
    t: "Vous écoutez",
    d: "Un corrigé de niveau C1 ou C2, écrit pour un vrai sujet d'expression écrite du TCF Canada et lu par une voix de synthèse naturelle. Rien à l'écran : seulement ce que vous entendez.",
  },
  {
    icon: PenLine,
    t: "Vous écrivez",
    d: "Vous tapez ce que vous avez entendu. Le correcteur orthographique, le copier-coller et la saisie automatique sont désactivés — c'est votre orthographe qui est mesurée, pas celle de votre navigateur.",
  },
  {
    icon: ScrollText,
    t: "Vous comprenez",
    d: "À la fin, le texte complet, mot à mot, avec la raison de chaque écart : accent manquant, homophone, accord, mot non entendu. Classé par fréquence, pour savoir quoi travailler en premier.",
  },
];

const FEATURES = [
  { icon: Ear, t: "Lu par groupes de sens", d: "La coupe tombe là où un lecteur reprend son souffle, jamais au milieu d'une idée." },
  { icon: Gauge, t: "Trois longueurs d'écoute", d: "Un groupe à la fois pour débuter, la phrase entière comme le jour J. Et quatre vitesses." },
  { icon: PenLine, t: "Les accents comptent", d: "Comme pour un correcteur du TCF. La ponctuation et les majuscules, non." },
  { icon: Lock, t: "Aucune aide", d: "Pas de correcteur, pas de collage, pas d'autocomplétion. L'exercice serait sans objet." },
  { icon: Sparkles, t: "De vrais sujets", d: "Les corrigés sont écrits pour les sujets d'expression écrite réellement tombés en session." },
  { icon: Headphones, t: "Réécoutes illimitées", d: "Elles sont comptées, jamais bloquées — le nombre d'écoutes fait partie du diagnostic." },
];

// The one thing that sells this exercise, so it gets its own block rather than
// a line in the grid: two candidates on 60 % have completely different problems
// and the report is what tells them apart.
function TheDiagnosis() {
  const { c, t } = useApp();
  return (
    <Card className="p-6 md:p-8 border-2 border-blue-600/30">
      <Pill tone="blue">{t("Ce qu'aucun autre exercice ne vous dit")}</Pill>
      <h3 className={`font-display font-extrabold text-xl sm:text-2xl mt-3 ${c.text}`}>
        {t("Votre oreille, ou votre stylo ?")}
      </h3>
      <p className={`mt-3 text-sm leading-relaxed ${c.sub}`}>
        {t("Deux candidats à soixante pour cent n'ont pas le même problème. L'un n'entend pas les mots ; l'autre les entend tous et les écrit mal. Ce sont deux chantiers différents, et travailler le mauvais ne fait rien avancer.")}
      </p>
      <p className={`mt-3 text-sm leading-relaxed ${c.sub}`}>
        {t("La dictée sépare les deux, en deux nombres. « Mots reconnus » mesure l'oreille. « Écrits sans faute » mesure l'oreille et l'orthographe. L'écart entre les deux est votre diagnostic.")}
      </p>
      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        <div className={`p-5 rounded-2xl border ${c.border}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${c.faint}`}>
            <Ear size={12} aria-hidden="true" /> {t("Mots reconnus")}
          </p>
          <p className="font-display font-extrabold text-3xl mt-1.5 text-emerald-500">88 %</p>
          <p className={`text-sm mt-1.5 ${c.sub}`}>{t("Vous entendez le français. Ce n'est pas là qu'il faut travailler.")}</p>
        </div>
        <div className={`p-5 rounded-2xl border ${c.border}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${c.faint}`}>
            <PenLine size={12} aria-hidden="true" /> {t("Écrits sans faute")}
          </p>
          <p className="font-display font-extrabold text-3xl mt-1.5 text-amber-500">61 %</p>
          <p className={`text-sm mt-1.5 ${c.sub}`}>{t("Vingt-sept points perdus à l'écrit seul : accents, accords, homophones.")}</p>
        </div>
      </div>
      <p className={`mt-4 text-xs ${c.faint}`}>
        {t("Exemple de rapport. Vos chiffres dépendent de votre dictée.")}
      </p>
    </Card>
  );
}

export function DicteePitch({ reason }) {
  const { c, nav, t } = useApp();
  // A visitor has no account at all, so the first thing they need is one; a
  // free account already has one and needs the forfait. Same page, different
  // door — sending a logged-out visitor straight to checkout loses them.
  const isVisitor = reason === "register";

  return (
    <PageShell
      back
      wide
      eyebrow={t("La dictée · Premium")}
      title={t("L'exercice qui vous dit d'où viennent vraiment vos fautes")}
      sub={t("Un corrigé de niveau C1 ou C2 lu à voix haute, que vous écrivez sans texte, sans correcteur et sans aide. Puis le compte exact de ce que vous avez entendu, et de ce que vous avez su écrire.")}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── how it works ────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <Card key={s.t} className="p-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl grad-brand text-white flex items-center justify-center shrink-0">
                  <s.icon size={18} />
                </span>
                <span className={`font-display font-extrabold text-2xl ${c.faint}`}>{i + 1}</span>
              </div>
              <h3 className={`mt-4 font-display font-bold text-base ${c.text}`}>{t(s.t)}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed ${c.sub}`}>{t(s.d)}</p>
            </Card>
          ))}
        </div>

        <TheDiagnosis />

        {/* ── the details ─────────────────────────────────────────────── */}
        <Card className="p-6 md:p-8">
          <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Une dictée faite comme il faut")}</h3>
          <p className={`mt-1.5 mb-6 text-sm ${c.sub}`}>
            {t("Pas un texte débité par un robot : chaque détail est réglé comme le ferait un formateur qui vous lirait la dictée.")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.t} className={`p-5 rounded-2xl border ${c.border}`}>
                <span className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <f.icon size={16} />
                </span>
                <h4 className={`mt-3 font-semibold text-sm ${c.text}`}>{t(f.t)}</h4>
                <p className={`mt-1 text-sm leading-relaxed ${c.sub}`}>{t(f.d)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── the library keeps growing ───────────────────────────────── */}
        <Card className="p-6 md:p-8">
          <h3 className={`font-display font-bold text-lg ${c.text}`}>{t("Une nouvelle dictée chaque jour")}</h3>
          <p className={`mt-2 text-sm leading-relaxed ${c.sub}`}>
            {t("Chaque nuit, un corrigé inédit est rédigé et enregistré pour chacune des trois tâches d'expression écrite. Et rien ne disparaît : tout ce qui a été écrit reste dans la bibliothèque, pour vous comme pour les autres. Plus vous revenez, plus il y en a.")}
          </p>
        </Card>

        {/* ── the ask ─────────────────────────────────────────────────── */}
        <Card className="p-7 md:p-9 text-center border-2 border-blue-600/40">
          <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
            <Crown size={22} />
          </span>
          <h3 className={`font-display font-extrabold text-xl sm:text-2xl mt-4 ${c.text}`}>
            {isVisitor ? t("La dictée fait partie de l'abonnement") : t("Débloquez la dictée")}
          </h3>
          <p className={`mt-2 text-sm max-w-lg mx-auto ${c.sub}`}>
            {t("Elle est incluse dans tous les forfaits, avec les simulations IA, les TCF blancs chronométrés et les quatre-vingts quiz.")}
          </p>
          <ul className="mt-6 max-w-md mx-auto space-y-2.5 text-left">
            {["La dictée, sans limite : toute la bibliothèque", "Les 80 quiz débloqués, compréhension écrite et orale", "TCF blancs chronométrés, notés sur 699", "Correction IA de vos expressions écrite et orale"].map((p) => (
              <li key={p} className={`flex items-start gap-3 text-sm ${c.sub}`}>
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />{t(p)}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            {isVisitor ? (
              <>
                <Btn variant="accent" icon={ArrowRight} onClick={() => nav("register")}>{t("Créer un compte")}</Btn>
                <Btn variant="ghost" onClick={() => nav("pricing")}>{t("Voir les forfaits")}</Btn>
              </>
            ) : (
              <>
                <Btn variant="accent" icon={ArrowRight} onClick={() => nav("pricing")}>{t("Voir les forfaits")}</Btn>
                <Btn variant="ghost" onClick={() => nav("practice")}>{t("Continuer en gratuit")}</Btn>
              </>
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
