import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ArrowRight, ChevronLeft, Headphones } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { EXAM_MODES } from "@/constants/exam";

const COUNTDOWN_FROM = 5;

// Shown once the candidate asks to start a TCF blanc: pick a mode (test vs
// entraînement) and start. No identity is collected — the exam is scored
// automatically and nothing is e-mailed.
export function ExamSetup({ onStart, onCancel, busy }) {
  const { c, t, tourStep, endTour } = useApp();
  const [mode, setMode] = useState("test");
  const [countdown, setCountdown] = useState(null); // null = not counting down; 5..0 while the intro plays
  const pendingRef = useRef(null); // payload handed to onStart once the countdown ends

  const submit = () => {
    // The guided tour's last step ends here — this button is the very thing
    // it was inviting the candidate to click, not a separate "next".
    if (tourStep != null) endTour();
    const payload = { mode };
    window.scrollTo({ top: 0 }); // so the exam mounts already at the top, no leftover scroll offset
    // The countdown intro is a Mode Réaliste ritual (real-exam pressure before the
    // first audio auto-plays). Mode Entraînement is a relaxed practice run, so
    // it skips straight into the session.
    if (mode !== "test") { onStart(payload); return; }
    pendingRef.current = payload;
    setCountdown(COUNTDOWN_FROM);
  };

  // Ticks the countdown down once per second; at 0 it hands off to onStart
  // (createAttempt + the exam runner mount) and keeps showing a "starting"
  // state until this screen is unmounted by the parent.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { onStart(pendingRef.current); return; }
    const id = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // Locks background scrolling while the countdown overlay is up, so the
  // "whole screen" really is locked on the countdown until the exam appears.
  // Keyed on whether we're counting (not the number itself), so it toggles
  // once per countdown rather than re-applying on every tick.
  const isCounting = countdown !== null;
  useEffect(() => {
    if (!isCounting) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [isCounting]);

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onCancel} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-6"><ChevronLeft size={15} /> {t("Retour")}</button>

      {/* The guided tour's last step (constants/tour.js: "exam-modes") spotlights
          this whole panel — mode cards and the real "Commencer" button together —
          reached by Mocks.jsx forcing `setup` true rather than the tour
          auto-starting an attempt itself. */}
      <Card className="p-6 md:p-8" data-tour="exam-modes">
        {/* Mode cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {EXAM_MODES.map((m) => {
            const active = m.id === mode;
            // Mode Réaliste is the one candidates should default to, so it
            // carries its own red accent (border, tinted background, glow)
            // whether or not it's the one currently picked — Mode
            // Entraînement only picks up its (blue) accent once selected,
            // so the contrast between the two stays obvious either way.
            const realistic = m.id === "test";
            return (
              <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={active}
                className={`text-left p-5 rounded-3xl border-2 transition-all relative
                ${realistic
                  ? `border-rose-500 bg-gradient-to-br from-rose-500/10 to-red-500/5 shadow-lg shadow-rose-500/10 ${active ? "from-rose-500/15 to-red-500/10" : ""}`
                  : active ? "border-blue-500 bg-blue-500/5" : `${c.border} ${c.hoverSoft}`}`}>
                <span className="absolute top-4 right-4"><Pill tone={m.badgeTone}>{t(m.badge)}</Pill></span>
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${realistic ? "bg-rose-500/20 text-rose-600" : "bg-blue-500/10 text-blue-600"}`}><m.icon size={20} /></span>
                <p className={`font-display font-bold text-lg mt-4 ${c.text}`}>{t(m.name)}</p>
                <p className={`text-xs font-semibold uppercase tracking-wide mt-0.5 ${c.faint}`}>{t(m.tagline)}</p>
                <ul className="mt-4 space-y-2">
                  {m.feats.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${c.sub}`}><CheckCircle2 size={15} className="text-emerald-500 shrink-0" />{t(f)}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <Btn variant="accent" className="w-full mt-7" icon={ArrowRight} disabled={busy || countdown !== null} onClick={submit}>
          {t(busy ? "Génération…" : mode === "test" ? "Commencer le test" : "Commencer l'entraînement")}
        </Btn>
        {/* Mode Réaliste runs on a countdown per épreuve; Mode Entraînement is
            untimed (Quiz's `untimed` prop) — saying "le chronomètre démarre"
            under that mode would be a promise the exam runner does not keep. */}
        <p className={`text-xs text-center mt-3 ${c.faint}`}>
          {t(mode === "test"
            ? "Le chronomètre démarre dès la première question. Score calculé automatiquement."
            : "Aucune limite de temps : avancez à votre rythme. Score calculé automatiquement à la fin.")}
        </p>
      </Card>

      {/* Countdown intro (Mode Réaliste only): blocks interaction for a beat before
          the exam mounts, so the candidate has a moment to settle before the
          timer and the first audio start automatically. Rendered through a
          portal to <body> so `fixed inset-0` is measured against the viewport —
          the setup screen sits inside PageShell's transformed `.rise` <main>,
          which would otherwise become the containing block and pin the overlay
          to that narrower, nav-offset box instead of the whole screen. */}
      {countdown !== null && createPortal(
        <div role="alertdialog" aria-modal="true" aria-live="assertive" className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div key={countdown} className="text-center rise">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-5">
              {t("Le TCF blanc commence dans…")}
            </p>
            {countdown > 0 ? (
              <p className="font-display font-extrabold text-white leading-none text-[110px] sm:text-[140px]">{countdown}</p>
            ) : (
              <span className="w-20 h-20 rounded-full grad-brand text-white flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/40"><Headphones size={32} /></span>
            )}
            {countdown > 0 && (
              <p className="text-white/60 text-sm mt-6 max-w-xs mx-auto">{t("Préparez-vous : le premier document audio sera joué automatiquement.")}</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
