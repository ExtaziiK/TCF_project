import { useState } from "react";
import { Calendar, Search, Zap, RotateCcw, Heart } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { VOCAB, VOCAB_CATS } from "@/constants/vocabulary";

export function Vocabulary() {
  const { c, favs, toggleFav, t } = useApp();
  const [cat, setCat] = useState("Tous");
  const [q, setQ] = useState("");
  const [flipped, setFlipped] = useState([]);
  const [mode, setMode] = useState("cards");
  const [qSel, setQSel] = useState(null);
  const list = VOCAB.filter((v) => (cat === "Tous" || v.cat === cat) && v.fr.toLowerCase().includes(q.toLowerCase()));
  const daily = VOCAB[6];
  const quizCard = VOCAB[3];
  const quizOpts = [VOCAB[0].fr, VOCAB[3].fr, VOCAB[7].fr, VOCAB[10].fr];
  const flip = (fr) => setFlipped(flipped.includes(fr) ? flipped.filter((x) => x !== fr) : [...flipped, fr]);
  return (
    <PageShell back wide eyebrow={t("Vocabulaire")} title={t("Le lexique de votre nouvelle vie")} sub={t("Cartes mémoire rédigées en contexte canadien. Cliquez une carte pour la retourner ; ajoutez vos mots difficiles aux favoris.")}>
      <Card className="p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-2 border-rose-600/30">
        <span className="w-12 h-12 rounded-2xl bg-rose-600/10 text-rose-600 flex items-center justify-center shrink-0"><Calendar size={20} /></span>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-600">{t("Mot du jour")}</p>
          <p className={`font-display font-bold text-lg ${c.text}`}>{daily.fr}</p>
          <p className={`text-sm ${c.sub}`}>{daily.def} — <span className="italic">« {daily.ex} »</span></p>
        </div>
      </Card>
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {VOCAB_CATS.map((ct) => (
            <button key={ct} onClick={() => setCat(ct)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${cat === ct ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>{t(ct)}</button>
          ))}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.faint}`} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Chercher un mot…")} aria-label={t("Chercher un mot")} className={`pl-10 pr-4 py-2.5 rounded-full border text-sm outline-none focus:border-blue-600 w-48 ${c.inputCls}`} />
          </div>
          <button onClick={() => setMode(mode === "cards" ? "quiz" : "cards")} className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 ${mode === "quiz" ? "bg-rose-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}>
            <Zap size={14} /> {t("Mode quiz")}
          </button>
        </div>
      </div>
      {mode === "quiz" ? (
        <Card className="max-w-xl mx-auto p-7 rise">
          <Pill tone="red"><Zap size={12} /> {t("Quiz éclair")}</Pill>
          <p className={`mt-4 font-medium ${c.text}`}>{t("Quel mot correspond à cette définition :")} « {quizCard.def} » ?</p>
          <div className="mt-5 space-y-2.5">
            {quizOpts.map((o) => {
              const st = qSel === null ? "idle" : o === quizCard.fr ? "right" : o === qSel ? "wrong" : "dim";
              return (
                <button key={o} disabled={qSel !== null} onClick={() => setQSel(o)} className={`w-full text-left px-5 py-3 rounded-2xl border text-sm font-medium transition-all
                  ${st === "idle" ? `${c.border} ${c.text} hover:border-blue-600 hover:bg-blue-600/5` : ""}
                  ${st === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
                  ${st === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
                  ${st === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>{o}</button>
              );
            })}
          </div>
          {qSel !== null && <Btn small className="mt-5" icon={RotateCcw} onClick={() => setQSel(null)}>{t("Une autre !")}</Btn>}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.length === 0 && <p className={`col-span-full text-center py-10 text-sm ${c.faint}`}>{t("Aucun mot ne correspond à")} « {q} » {t("dans cette catégorie.")}</p>}
          {list.map((v) => {
            const isFlipped = flipped.includes(v.fr);
            const isFav = favs.includes(v.fr);
            return (
              <div key={v.fr} className="fwrap h-48">
                <div className={`fcard relative w-full h-full ${isFlipped ? "flipped" : ""}`}>
                  <button onClick={() => flip(v.fr)} className={`fface absolute inset-0 rounded-3xl border ${c.border} ${c.card} p-6 flex flex-col items-center justify-center text-center card-lift`} aria-label={`${t("Retourner la carte")} ${v.fr}`}>
                    <Pill tone="slate" className="absolute top-4 left-4">{t(v.cat)}</Pill>
                    <span onClick={(e) => { e.stopPropagation(); toggleFav(v.fr); }} role="button" aria-label={t("Favori")} className={`absolute top-3.5 right-3.5 p-1.5 rounded-full ${isFav ? "text-rose-600" : c.faint} hover:text-rose-600`}>
                      <Heart size={17} fill={isFav ? "currentColor" : "none"} />
                    </span>
                    <p className={`font-display font-bold text-xl ${c.text}`}>{v.fr}</p>
                    <p className={`mt-2 text-xs ${c.faint}`}>{t("Cliquez pour voir la définition")}</p>
                  </button>
                  <button onClick={() => flip(v.fr)} className="fface fback absolute inset-0 rounded-3xl p-6 flex flex-col justify-center text-left text-white grad-brand shadow-xl" aria-label={t("Retourner la carte")}>
                    <p className="text-sm font-semibold leading-relaxed">{v.def}</p>
                    <p className="mt-3 text-sm italic opacity-90">« {v.ex} »</p>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
