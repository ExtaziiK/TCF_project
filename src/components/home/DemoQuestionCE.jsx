import { useState } from "react";
import { BookOpen, CheckCircle2, XCircle, Lightbulb, ArrowRight, ZoomIn, ZoomOut } from "lucide-react";
import DEMO_CE from "virtual:bank-demo-ce";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { CE_DEMO_A2 } from "@/constants/demoPool";
import { DemoSteps } from "@/components/home/DemoSteps";

// The demo's documents ship as static files (scripts/fetch-demo-media.mjs), not
// through the signed bucket: the image request goes out on the first render,
// instead of after the quiz chunk and an /api/media round trip. Quiz 1 is the
// public teaser, so this exposes nothing the API doesn't already hand out.
const DEMO_IMAGES = import.meta.glob("/src/assets/demo/ce1/*.webp", { eager: true, query: "?url", import: "default" });
const imageFor = (order) => DEMO_IMAGES[`/src/assets/demo/ce1/q${order}.webp`] || null;

// Picks a random A2/B1 Compréhension écrite item from Quiz 1 of the actual bank
// (src/bank/ce/Quiz_1_CE.json, pool in src/constants/demoPool.js). The question
// text is baked in at build time (virtual:bank-demo-ce), so nothing waits on a
// download. Returns null if no pool question has its document, in which case
// the card simply isn't rendered.
function realDemoQuestion() {
  const pool = DEMO_CE.filter((q) => imageFor(q.order));
  if (!pool.length) return null;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return { ...picked, image: imageFor(picked.order), level: CE_DEMO_A2.includes(Number(picked.order)) ? "A2" : "B1", kind: "bank" };
}

// Remembered document aspect ratio (width / height) so the reserved image slot
// matches the real document — no empty letterbox space, and re-mounts within a
// session reserve the exact box. Seeded with a landscape-ish default (these CE
// documents are wider than tall) for the very first paint before any load.
let CE_DOC_RATIO = 1.5;

// Hero teaser mirroring the CO DemoQuestion, for Compréhension écrite: the
// reading document on top, then the lettered options, correction and
// explanation below. `embedded`: inside the tools showcase's panel — no card
// chrome, and the document opens as a short preview so the panel stays a
// sensible height (the Agrandir button is right there).
export function DemoQuestionCE({ embedded = false }) {
  const { c, nav, t } = useApp();
  const [sel, setSel] = useState(null);
  const [imgOk, setImgOk] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [ratio, setRatio] = useState(CE_DOC_RATIO); // width/height, learned on load
  const [big, setBig] = useState(!embedded); // standalone, opens zoomed in so the document is readable
  const [q] = useState(realDemoQuestion);
  if (!q) return null;
  const hasImage = !!q.image;

  const explanation = `${t("Bonne réponse :")} « ${q.opts[q.a]} ». ${q.exp || t("C'est la seule proposition fidèle au document.")}`;

  return (
    <div className="space-y-4">
      {hasImage && imgOk && (
        <div className={`rounded-2xl border ${c.border} ${c.card} p-2 shadow-xl shadow-rose-600/10`}>
          {/* The slot reserves space from the document's aspect ratio (learned
              on load, cached for the session) rather than a fixed height, so it
              holds its place from first paint AND hugs the image with no empty
              letterbox. Zoomed uses that ratio (capped so a tall document can't
              exceed the viewport); collapsed is a short fixed preview. */}
          <div
            className={`relative rounded-xl overflow-hidden transition-[height] duration-300 ${big ? "w-full" : "h-64"}`}
            style={big ? { aspectRatio: String(ratio), maxHeight: "82vh" } : undefined}
          >
            {/* Skeleton reserves the slot until the image paints; it sits behind
                the document. */}
            {!imgLoaded && <div className={`absolute inset-0 animate-pulse rounded-xl ${c.track}`} aria-hidden="true" />}
            {q.image && (
              <img
                src={q.image}
                alt={t("Document à lire")}
                width={1200}
                height={800}
                decoding="async"
                // Lowercase via spread: React 18 has no fetchPriority prop yet.
                {...{ fetchpriority: "high" }}
                onLoad={(e) => {
                  setImgLoaded(true);
                  const el = e.currentTarget;
                  if (el.naturalWidth && el.naturalHeight) { CE_DOC_RATIO = el.naturalWidth / el.naturalHeight; setRatio(CE_DOC_RATIO); }
                }}
                onError={() => setImgOk(false)}
                className="relative w-full h-full object-contain"
              />
            )}
            <button
              type="button"
              onClick={() => setBig((v) => !v)}
              aria-label={big ? t("Réduire l'image") : t("Agrandir l'image")}
              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900/70 text-white shadow-lg hover:bg-slate-900/90 transition-colors"
            >
              {big ? <><ZoomOut size={14} /> {t("Réduire")}</> : <><ZoomIn size={14} /> {t("Agrandir")}</>}
            </button>
          </div>
        </div>
      )}
      <Card className={`relative overflow-hidden ${embedded ? "p-5" : "p-6 md:p-7 shadow-xl shadow-rose-600/10"}`}>
        {!embedded && <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-rose-600/10 blur-2xl" aria-hidden="true" />}
        {!embedded && (
          <div className="flex items-center justify-between mb-4 relative">
            <Pill tone="red"><BookOpen size={12} /> {t("Question du jour · CE")}</Pill>
            <Pill tone="slate">{t("Niveau")} {q.level}</Pill>
          </div>
        )}
        <DemoSteps tone="red" steps={["Lisez le document ci-dessus", "Cliquez sur la bonne réponse"]} done={sel !== null} />
        <div className="space-y-2.5">
          {q.opts.map((o, i) => {
            const state = sel === null ? "idle" : i === q.a ? "right" : i === sel ? "wrong" : "dim";
            return (
              <button key={o} disabled={sel !== null} onClick={() => setSel(i)}
                className={`group w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between gap-2
                ${state === "idle" ? `${c.border} ${c.text} cursor-pointer hover:border-rose-600 hover:bg-rose-600/10 hover:-translate-y-0.5 hover:shadow-md` : ""}
                ${state === "right" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : ""}
                ${state === "wrong" ? "border-rose-500 bg-rose-500/10 text-rose-600" : ""}
                ${state === "dim" ? `${c.border} opacity-40 ${c.sub}` : ""}`}>
                <span className="flex items-center"><span className={`font-mono2 font-bold mr-3 w-6 h-6 rounded-lg grid place-items-center shrink-0 text-xs ${state === "idle" ? "border border-current opacity-70 group-hover:opacity-100" : "opacity-60"}`}>{String.fromCharCode(65 + i)}</span>{o}</span>
                {state === "right" && <CheckCircle2 size={17} className="shrink-0" />}
                {state === "wrong" && <XCircle size={17} className="shrink-0" />}
              </button>
            );
          })}
        </div>
        {sel !== null && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-600/10 text-sm rise">
            <p className="font-semibold text-rose-600 flex items-center gap-1.5 mb-1"><Lightbulb size={14} /> {t("Explication")}</p>
            <p className={c.sub}>{explanation}</p>
            <Btn small variant="accent" className="mt-4" icon={ArrowRight} onClick={() => nav("reading")}>{t("Continuer en pratique gratuite")}</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
