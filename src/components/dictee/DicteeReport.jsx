import { Trophy, RotateCcw, Ear, PenLine, Gauge, ArrowRight, Lightbulb } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, ProgressBar, Btn } from "@/components/common";
import { SentenceDiff } from "@/components/dictee/SentenceDiff";

// End-of-dictée report.
//
// The headline is three numbers, not one, because a dictée fails in two
// different ways and they need different work. "Mots reconnus" is the ear:
// what the candidate correctly identified. "Score" is the ear AND the pen:
// what they also spelt correctly. The gap between the two is the whole
// diagnosis — a large gap is an orthography problem and no amount of extra
// listening will close it, while a low "reconnus" is a listening problem and
// spelling drills would be wasted on it.

const scoreTone = (pct) => (pct >= 85 ? "green" : pct >= 60 ? "amber" : "red");

export function DicteeReport({ dictee, summary, results, plays, speed, playsPerSentence, onRestart, onNewTask }) {
  const { c, nav, t } = useApp();
  const gap = summary.heardPct - summary.score;

  // The gap between hearing and spelling is what decides the advice, so the
  // wide-gap case is tested FIRST: someone at 55 % who heard 85 % has an
  // orthography problem, and telling them to work on their listening — which
  // the raw score alone would suggest — would send them at the wrong thing.
  const verdict = gap >= 20
    ? { icon: PenLine, text: `Vous avez entendu ${summary.heardPct} % des mots mais n'en avez écrit correctement que ${summary.score} %. Votre oreille suit — c'est l'orthographe qui vous coûte des points.` }
    : summary.heardPct < 70
      ? { icon: Ear, text: `${100 - summary.heardPct} % des mots n'ont pas été identifiés. Travaillez d'abord l'écoute : ralentissez à 0,8× et refaites la même dictée.` }
      : { icon: Trophy, text: "Écoute et orthographe avancent ensemble. Montez d'une tâche ou repassez à vitesse normale pour durcir l'exercice." };

  return (
    <div className="space-y-5 rise">
      {/* ── score ─────────────────────────────────────────────────────── */}
      <Card className="p-7">
        <div className="text-center">
          <Trophy size={36} className="text-amber-500 mx-auto" />
          <h3 className={`font-display font-bold text-2xl mt-3 ${c.text}`}>{t("Dictée corrigée")}</h3>
          {/* Le niveau du corrigé (C1/C2) n'apparaît pas ici : sur une page de
              résultats il se lit comme le niveau ATTEINT par le candidat, alors
              qu'il ne qualifie que le texte dicté. Il reste annoncé avant
              l'exercice, où le contresens n'est pas possible. */}
          <p className={`mt-1 text-sm ${c.sub}`}>
            {t("Tâche")} {dictee.task} · {summary.words} {t("mots")}
          </p>
          <p className="font-display font-extrabold text-5xl mt-5 grad-text">{summary.score} %</p>
          <div className="max-w-xs mx-auto mt-4"><ProgressBar pct={summary.score} tone="grad" /></div>
        </div>

        <div className="mt-7 grid sm:grid-cols-3 gap-3">
          <Stat label={t("Mots reconnus")} value={`${summary.heardPct} %`} detail={`${summary.heard} / ${summary.words}`} tone={scoreTone(summary.heardPct)} icon={Ear} />
          <Stat label={t("Écrits sans faute")} value={`${summary.score} %`} detail={`${summary.correct} / ${summary.words}`} tone={scoreTone(summary.score)} icon={PenLine} />
          <Stat
            label={t("Accents")}
            value={summary.accentTotal ? `${summary.accentPct} %` : "—"}
            detail={summary.accentTotal ? `${summary.accentOk} / ${summary.accentTotal}` : t("aucun mot accentué")}
            tone={summary.accentTotal ? scoreTone(summary.accentPct) : "slate"}
            icon={PenLine}
          />
        </div>

        <div className="mt-5 p-5 rounded-2xl bg-blue-600/10 flex gap-3">
          <verdict.icon size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <p className={`text-sm leading-relaxed ${c.sub}`}>{verdict.text}</p>
        </div>

        <p className={`mt-4 text-xs flex items-center justify-center gap-1.5 ${c.faint}`}>
          <Gauge size={13} aria-hidden="true" />
          {plays} {t("écoutes au total")} · {playsPerSentence} {t("par phrase")} · {t("vitesse")} {speed}×
        </p>
      </Card>

      {/* ── what went wrong, by family ────────────────────────────────── */}
      {summary.ranked.length > 0 && (
        <Card className="p-6 md:p-7">
          <h4 className={`font-semibold text-sm mb-1.5 flex items-center gap-2 ${c.text}`}>
            <Lightbulb size={16} className="text-blue-600" /> {t("Vos erreurs, par type")}
          </h4>
          <p className={`text-sm mb-5 ${c.sub}`}>{t("Classées par fréquence : la première ligne est celle qui vous coûte le plus.")}</p>
          <div className="space-y-2.5">
            {summary.ranked.map((f) => (
              <div key={f.family} className={`p-4 rounded-2xl border ${c.border}`}>
                <div className="flex items-center gap-3">
                  <span className={`font-mono2 font-bold text-lg ${c.text}`}>{f.count}</span>
                  <span className={`font-semibold text-sm ${c.text}`}>{f.label}</span>
                </div>
                <p className={`mt-1 text-sm leading-relaxed ${c.sub}`}>{f.hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Btn small variant="soft" icon={ArrowRight} onClick={() => nav("grammar")}>{t("Travailler ces points en grammaire")}</Btn>
          </div>
        </Card>
      )}

      {/* ── the text, sentence by sentence ────────────────────────────── */}
      <Card className="p-6 md:p-7">
        <h4 className={`font-semibold text-sm mb-1.5 ${c.text}`}>{t("Le texte dicté")}</h4>
        <p className={`text-sm mb-5 ${c.sub}`}>{t("Le corrigé C1/C2 du sujet, avec vos écarts phrase par phrase.")}</p>
        <div className="space-y-5">
          {results.map((diff, i) => (
            <div key={i} className={`pb-5 ${i < results.length - 1 ? `border-b ${c.border}` : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <Pill tone="slate">{i + 1}</Pill>
                {diff.perfect
                  ? <Pill tone="green">{t("Parfaite")}</Pill>
                  : <Pill tone={scoreTone(Math.round((diff.ok / diff.total) * 100))}>{diff.ok} / {diff.total} {t("mots")}</Pill>}
              </div>
              <SentenceDiff diff={diff} />
            </div>
          ))}
        </div>
      </Card>

      {/* ── the sujet this text answered ──────────────────────────────── */}
      <Card className="p-6">
        <p className={`text-xs font-bold uppercase tracking-widest text-blue-600 mb-2`}>
          {t("Sujet d'expression écrite · tâche")} {dictee.task}
        </p>
        <p className={`text-sm leading-relaxed whitespace-pre-line ${c.sub}`}>{dictee.prompt}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Btn small variant="ghost" icon={ArrowRight} onClick={() => nav("writing")}>{t("Rédiger ma propre réponse")}</Btn>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 justify-center">
        <Btn icon={RotateCcw} onClick={onRestart}>{t("Nouvelle dictée")}</Btn>
        <Btn variant="ghost" onClick={onNewTask}>{t("Changer de tâche")}</Btn>
      </div>
    </div>
  );
}

function Stat({ label, value, detail, tone, icon: Icon }) {
  const { c } = useApp();
  return (
    <div className={`p-4 rounded-2xl border ${c.border} text-center`}>
      <p className={`text-xs font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5 ${c.faint}`}>
        <Icon size={12} aria-hidden="true" /> {label}
      </p>
      <p className={`font-display font-bold text-2xl mt-1.5 ${c.text}`}>{value}</p>
      <Pill tone={tone} className="mt-2">{detail}</Pill>
    </div>
  );
}
