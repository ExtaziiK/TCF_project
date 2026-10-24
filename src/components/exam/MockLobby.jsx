import { Plane, Play, Crown, Check, Trash2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { PALETTE } from "@/components/home/toolsData";
import { MOCK_SECTIONS } from "@/constants/mocks";
import { levelForPct } from "@/services/examService";

// The TCF blanc lobby, as the boarding area of the passerelle to Canada (the
// landing page already shows the TCF blanc as a boarding pass): the exam is a
// boarding pass whose route is the four épreuves, exams in progress are
// tickets showing how far along the route they are, and finished ones are
// stubs with the score. Each épreuve keeps its colour everywhere on the site.

const SECTION_ORDER = ["co", "ce", "ee", "eo"]; // MOCK_SECTIONS' order
const TONE = { co: "blue", ce: "rose", ee: "violet", eo: "amber" };
const CODE = { co: "CO", ce: "CE", ee: "EE", eo: "EO" };
const BARCODE = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2];

function sectionColors(section, dark) {
  const [pale, ink, soft] = PALETTE[TONE[section] || "blue"][dark ? "dark" : "light"];
  return { pale, ink, soft };
}

const when = (iso) => new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/* ── the boarding pass ──────────────────────────────────────────────────── */

// `cta` is the stub's content (start button, or the free-tier states), built
// by Mocks.jsx, which owns that logic.
export function MockBoardingPass({ cta }) {
  const { c, t, dark, nav } = useApp();
  const blue = PALETTE.blue[dark ? "dark" : "light"];
  const page = dark ? "#020617" : "#EDF1F7"; // the canvas, seen through the notches
  const edge = dark ? "#334155" : "#CBD5E1";
  const field = (label, value) => (
    <div>
      <p className={`font-mono2 text-[10px] font-bold uppercase tracking-widest ${c.faint}`}>{label}</p>
      <p className={`mt-0.5 font-display font-extrabold text-xl ${c.text}`}>{value}</p>
    </div>
  );

  return (
    <div className={`relative flex flex-col lg:flex-row rounded-[32px] border-2 mb-10 ${c.card}`} style={{ borderColor: edge }}>
      {/* Order: the stub (with the start button) comes first — left of the
          tear line from lg, on top when stacked — then the ticket's details. */}
      <div className="order-last flex-1 min-w-0 p-6 md:p-9">
        <span className="inline-flex items-center gap-1.5 font-mono2 text-[11px] font-bold uppercase tracking-widest" style={{ color: blue[1] }}>
          <Plane size={14} /> {t("Carte d'embarquement")} · TCF Canada
        </span>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
          {field(t("Épreuves"), "4")}
          {field(t("Durée"), "2 h 47")}
          {field(t("Score"), "/ 699")}
          {field(t("Destination"), "Canada")}
        </div>

        {/* The route: the four épreuves in exam order. Hover a stop for what
            it is; the guide has the full detail. */}
        <div className="mt-8 flex items-start">
          {SECTION_ORDER.map((s, i) => {
            const sec = MOCK_SECTIONS[i];
            const k = sectionColors(s, dark);
            return (
              <div key={s} className="flex items-start flex-1 last:flex-none min-w-0">
                <div className="group relative flex flex-col items-center text-center w-20 sm:w-28 shrink-0">
                  <span className="grid place-items-center w-14 h-14 rounded-full font-display font-extrabold text-sm transition-transform group-hover:scale-110"
                    style={{ background: k.pale, color: k.ink, boxShadow: `0 0 0 2px ${k.ink}` }}>
                    <sec.icon size={20} />
                  </span>
                  <span className={`mt-2 text-xs font-bold leading-tight ${c.text}`}>{t(sec.t)}</span>
                  <span className={`mt-0.5 font-mono2 text-[10px] ${c.faint}`}>{t(sec.d)}</span>
                  {/* What the épreuve is, on hover/focus. */}
                  <span role="tooltip" className="pointer-events-none absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-60 rounded-xl bg-slate-900 text-white text-[11px] leading-snug text-left px-3 py-2 shadow-xl opacity-0 translate-y-1 transition group-hover:opacity-100 group-hover:translate-y-0 z-20">
                    {t(sec.desc)}
                  </span>
                </div>
                {i < SECTION_ORDER.length - 1 && <span className={`flex-1 mt-7 mx-1 border-t-2 border-dashed ${c.border}`} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => nav("guide")} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:gap-1.5 transition-all">
          {t("Le détail des épreuves")} <ArrowRight size={14} />
        </button>
      </div>

      {/* Tear line with page-coloured notches: horizontal when stacked,
          vertical from lg. Each notch is a circle clipped to its inner half. */}
      <div className="relative h-0 lg:h-auto lg:w-0" aria-hidden="true">
        <span className={`absolute left-6 right-6 top-0 border-t-2 border-dashed lg:hidden ${c.border}`} />
        <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full border-2 lg:hidden" style={{ borderColor: edge, background: page, clipPath: "inset(0 0 0 50%)" }} />
        <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full border-2 lg:hidden" style={{ borderColor: edge, background: page, clipPath: "inset(0 50% 0 0)" }} />
        <span className={`absolute top-6 bottom-6 left-0 border-l-2 border-dashed hidden lg:block ${c.border}`} />
        <span className="absolute -top-3 -left-3 w-6 h-6 rounded-full border-2 hidden lg:block" style={{ borderColor: edge, background: page, clipPath: "inset(50% 0 0 0)" }} />
        <span className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full border-2 hidden lg:block" style={{ borderColor: edge, background: page, clipPath: "inset(0 0 50% 0)" }} />
      </div>

      <div className="order-first lg:w-80 p-6 md:p-8 flex flex-col items-center justify-center gap-4 text-center rounded-t-[30px] lg:rounded-tr-none lg:rounded-l-[30px]" style={{ background: blue[0] }}>
        <span className={`font-mono2 text-[10px] font-bold uppercase tracking-widest ${c.faint}`}>{t("Embarquement")}</span>
        {cta}
        <div className="flex items-stretch gap-[2px] h-11" aria-hidden="true">
          {BARCODE.map((w, i) => <span key={i} style={{ width: w * 2, background: i % 2 ? "transparent" : (dark ? "#CBD5E1" : "#1E293B") }} />)}
        </div>
      </div>
    </div>
  );
}

// The stub's content for the normal and free-tier cases.
export function BoardingCta({ freeUsedUp, freeAvailable, disabled, onStart }) {
  const { c, t, nav } = useApp();
  if (freeUsedUp) {
    // The one free TCF blanc has been sat. The report stays reachable from the
    // history below — only starting another is blocked.
    return (
      <>
        <p className={`font-semibold text-sm ${c.text}`}>{t("Vous avez déjà passé votre TCF blanc gratuit")}</p>
        <p className={`text-xs ${c.sub}`}>{t("Votre résultat reste consultable dans l'historique. Les examens suivants font partie de l'abonnement Premium.")}</p>
        <Btn variant="accent" className="w-full !py-4 !text-lg" icon={Crown} onClick={() => nav("pricing")}>{t("Voir les forfaits")}</Btn>
      </>
    );
  }
  return (
    <>
      {/* Animated (pulsing ring + light sweep, .cta-live) while it can be pressed. */}
      <Btn variant="accent" className={`w-full !py-4 !text-lg ${disabled ? "" : "cta-live"}`} icon={Play} disabled={disabled} onClick={onStart}>
        {t(freeAvailable ? "Commencer mon TCF blanc gratuit" : "Commencer l'examen")}
      </Btn>
      <p className={`text-xs ${c.sub}`}>
        {t(freeAvailable
          ? "Un TCF blanc complet offert, correction IA comprise. Un seul : prenez votre temps."
          : "Progression sauvegardée : interrompez quand vous voulez.")}
      </p>
    </>
  );
}

/* ── an exam in progress: a ticket showing how far along the route ───────── */

export function InProgressTicket({ attempt, onResume, onAbandon }) {
  const { c, t, dark } = useApp();
  const results = attempt.progress?.results || {};
  const current = Math.min(attempt.progress?.taskIndex || 0, attempt.tasks.length - 1);
  return (
    <Card className="p-5 md:p-6 transition-shadow duration-200 hover:shadow-xl hover:shadow-blue-600/10">
      <div className="flex items-center justify-between gap-3 mb-5">
        <Pill tone="amber"><Play size={12} /> {t("En cours")}</Pill>
        <span className={`text-xs font-mono2 ${c.faint}`}>{t("Commencé le")} {t(when(attempt.startedAt))}</span>
      </div>
      <div className="flex items-center" aria-label={`${t("Tâche")} ${current + 1} / ${attempt.tasks.length}`}>
        {attempt.tasks.map((task, i) => {
          const k = sectionColors(task.section, dark);
          const done = results[task.order] != null;
          const now = i === current && !done;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <span className="relative grid place-items-center w-10 h-10 rounded-full font-display font-extrabold text-[11px] shrink-0"
                style={done ? { background: k.ink, color: "#FFFFFF" } : now ? { background: k.pale, color: k.ink, boxShadow: `0 0 0 2px ${k.ink}` } : { background: k.pale, color: k.ink, opacity: 0.55 }}>
                {now && <span className="invite-ping absolute inset-0 rounded-full border-2" style={{ borderColor: k.ink }} />}
                {done ? <Check size={16} strokeWidth={3} /> : CODE[task.section] || "?"}
              </span>
              {i < attempt.tasks.length - 1 && <span className={`flex-1 mx-1.5 border-t-2 ${done ? "border-solid" : "border-dashed"}`} style={{ borderColor: done ? k.ink : undefined }} />}
            </div>
          );
        })}
      </div>
      <p className={`mt-3 text-xs font-mono2 ${c.faint}`}>
        {t("Tâche")} {current + 1} / {attempt.tasks.length} · {t(MOCK_SECTIONS[SECTION_ORDER.indexOf(attempt.tasks[current]?.section)]?.t || "TCF blanc")}
      </p>
      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <Btn small variant="accent" icon={Play} onClick={onResume}>{t("Reprendre l'examen")}</Btn>
        <Btn small variant="ghost" className="text-rose-600" icon={Trash2} onClick={onAbandon}>{t("Abandonner")}</Btn>
      </div>
    </Card>
  );
}

/* ── a finished exam: a stub with the score ──────────────────────────────── */

export function HistoryStub({ attempt, onReview }) {
  const { c, t, dark } = useApp();
  const perTask = attempt.score?.perTask || [];
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <Pill tone="green"><CheckCircle2 size={12} /> {t("Terminé")}</Pill>
        <span className={`text-xs font-mono2 ${c.faint}`}>{t(when(attempt.completedAt))}</span>
      </div>
      <p className={`font-display font-extrabold text-3xl ${c.text}`}>
        {attempt.score?.points ?? 0}<span className={`text-lg font-bold ${c.faint}`}> / 699</span>
      </p>
      <p className={`text-xs mt-0.5 ${c.sub}`}>{attempt.score?.ok} / {attempt.score?.total} {t("bonnes réponses")}</p>
      {/* One chip per épreuve, in its colour — a candidate may be B1 in one
          épreuve and A2 in another, so no single blended level. */}
      {perTask.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {perTask.map((task, i) => {
            const k = sectionColors(task.section, dark);
            const selfAssessed = task.type && task.type !== "quiz";
            const pct = task.total ? Math.round((task.ok / task.total) * 100) : 0;
            return (
              <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl" style={{ background: k.pale }}>
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: k.ink }}>{CODE[task.section] || task.section}</span>
                <span className={`text-xs font-mono2 font-bold ${c.text}`}>{selfAssessed ? t("Auto") : levelForPct(pct)}</span>
              </div>
            );
          })}
        </div>
      )}
      <Btn small variant="ghost" className="mt-4 w-full" icon={ArrowRight} onClick={onReview}>{t("Revoir le détail")}</Btn>
    </Card>
  );
}
