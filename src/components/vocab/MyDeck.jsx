import { useState } from "react";
import { Brain, CheckCircle2, RotateCcw, Trash2, Eye, Library, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { useVocabDeck } from "@/hooks/useVocabDeck";
import { MAX_BOX, nextDue } from "@/utils/srs";

// « Mon lexique » — the learner's own deck and its daily review.
//
// Review is recall, not recognition: the word is shown alone, the learner tries
// to remember what it means and how to use it, then reveals the explanation and
// the example and says honestly whether they knew it. Known words come back
// later and later (src/utils/srs.js); forgotten ones come back tomorrow.

const SOURCE_LABEL = { vocab: "Vocabulaire", "mot-precis": "Le mot précis", connecteur: "Connecteur", modele: "Modèle de réponse" };

const fmtDay = (t, lang) => new Date(t).toLocaleDateString(lang === "en" ? "en-CA" : "fr-CA", { weekday: "long", day: "numeric", month: "long" });

function Boxes({ box }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${box}/${MAX_BOX}`}>
      {Array.from({ length: MAX_BOX }, (_, i) => (
        <span key={i} className={`w-1.5 h-3 rounded-sm ${i < box ? "bg-emerald-500" : "bg-slate-400/25"}`} />
      ))}
    </span>
  );
}

function ReviewSession({ deck, onDone }) {
  const { c, t } = useApp();
  // The queue is fixed when the session starts, so reviewing a card does not
  // reshuffle what is left.
  const [queue] = useState(() => deck.due.slice(0, 30));
  const [pos, setPos] = useState(0);
  const [shown, setShown] = useState(false);
  const [knewCount, setKnewCount] = useState(0);
  const card = queue[pos];

  const answer = async (knew) => {
    await deck.review(card, knew);
    if (knew) setKnewCount((n) => n + 1);
    setShown(false);
    setPos((p) => p + 1);
  };

  if (!card) {
    return (
      <Card className="max-w-xl mx-auto p-8 text-center rise">
        <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
        <p className={`mt-3 font-display font-bold text-xl ${c.text}`}>{t("Révision terminée")}</p>
        <p className={`mt-1 text-sm ${c.sub}`}>{knewCount} / {queue.length} {t("mots retrouvés. Les autres reviendront demain.")}</p>
        <Btn className="mt-5" onClick={onDone}>{t("Retour à mon lexique")}</Btn>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl mx-auto p-8 rise">
      <div className="flex items-center justify-between mb-6">
        <Pill tone="blue"><Brain size={12} /> {t("Révision du jour")}</Pill>
        <span className={`text-xs font-mono2 ${c.faint}`}>{pos + 1} / {queue.length}</span>
      </div>
      <p className={`text-center font-display font-bold text-3xl leading-tight ${c.text}`}>{card.term}</p>
      {!shown ? (
        <div className="mt-8 text-center">
          <p className={`text-sm ${c.sub}`}>{t("Que signifie ce mot ? Dans quelle phrase l’emploieriez-vous ?")}</p>
          <Btn className="mt-5" icon={Eye} onClick={() => setShown(true)}>{t("Voir la réponse")}</Btn>
        </div>
      ) : (
        <div className="mt-6 rise">
          {card.def && <p className={`text-sm leading-relaxed ${c.text}`}>{card.def}</p>}
          {card.example && <p className={`mt-3 text-sm italic leading-relaxed ${c.sub}`}>« {card.example} »</p>}
          <div className="mt-7 grid grid-cols-2 gap-3">
            <Btn variant="ghost" icon={RotateCcw} onClick={() => answer(false)}>{t("À revoir")}</Btn>
            <Btn icon={CheckCircle2} onClick={() => answer(true)}>{t("Je savais")}</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

export function MyDeck() {
  const { c, t, lang } = useApp();
  const deck = useVocabDeck();
  const [reviewing, setReviewing] = useState(false);
  const [q, setQ] = useState("");

  if (reviewing) return <ReviewSession deck={deck} onDone={() => setReviewing(false)} />;

  const upcoming = nextDue(deck.cards);
  const list = deck.cards
    .filter((x) => !q || x.term.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.added - a.added);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <Card className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-1 grid grid-cols-3 gap-3 text-center">
          <div><p className={`font-display font-bold text-3xl ${c.text}`}>{deck.stats.due}</p><p className={`text-xs ${c.sub}`}>{t("à réviser aujourd’hui")}</p></div>
          <div><p className={`font-display font-bold text-3xl ${c.text}`}>{deck.stats.total}</p><p className={`text-xs ${c.sub}`}>{t("mots dans mon lexique")}</p></div>
          <div><p className="font-display font-bold text-3xl text-emerald-500">{deck.stats.mastered}</p><p className={`text-xs ${c.sub}`}>{t("maîtrisés")}</p></div>
        </div>
        {deck.stats.due > 0 ? (
          <Btn icon={Brain} onClick={() => setReviewing(true)}>{t("Commencer la révision")}</Btn>
        ) : (
          <p className={`text-sm sm:max-w-[14rem] ${c.sub}`}>
            {deck.stats.total
              ? `${t("Rien à réviser aujourd’hui. Prochaine révision :")} ${upcoming ? fmtDay(upcoming, lang) : "—"}.`
              : t("Votre lexique est vide pour l’instant.")}
          </p>
        )}
      </Card>

      <Card className={`p-5 text-sm ${c.sub}`}>
        <p className={`font-semibold flex items-center gap-2 ${c.text}`}><Sparkles size={15} className="text-blue-600" /> {t("Comment votre lexique se remplit")}</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>{t("Chaque réponse manquée dans « Le mot précis », « Les connecteurs » ou le quiz éclair y est ajoutée automatiquement.")}</li>
          <li>{t("Sur une carte de vocabulaire ou un modèle de réponse, touchez « + Mon lexique » pour garder un mot ou une expression.")}</li>
          <li>{t("Un mot retrouvé revient dans 3, 7, 16 puis 35 jours ; un mot oublié revient dès demain.")}</li>
        </ul>
      </Card>

      {deck.cards.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <p className={`font-display font-bold flex items-center gap-2 ${c.text}`}><Library size={16} className="text-blue-600" /> {t("Mes mots")}</p>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher…")} aria-label={t("Rechercher dans mon lexique")} className={`ml-auto px-3 py-1.5 rounded-xl border text-sm outline-none ${c.inputCls}`} />
          </div>
          <ul className="divide-y divide-slate-400/15">
            {list.map((x) => (
              <li key={x.term} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${c.text}`}>{x.term}</p>
                  {x.def && <p className={`text-xs mt-0.5 line-clamp-2 ${c.sub}`}>{x.def}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Boxes box={x.box} />
                  <span className={`text-[11px] ${c.faint}`}>{t(SOURCE_LABEL[x.source] || "Vocabulaire")}</span>
                </div>
                <button type="button" onClick={() => deck.remove(x.term)} aria-label={`${t("Retirer")} ${x.term}`} className={`p-1.5 rounded-lg ${c.faint} hover:text-rose-600`}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
