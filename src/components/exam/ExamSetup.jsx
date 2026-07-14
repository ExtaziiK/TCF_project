import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ArrowRight, ChevronLeft, Headphones } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn } from "@/components/common";
import { EXAM_MODES, COUNTRIES } from "@/constants/exam";

const COUNTDOWN_FROM = 5;

// Shown once the candidate asks to start a TCF blanc: pick a mode (test vs
// entraînement) and enter the identity shown on the exam screen (no e-mail
// collected — results aren't sent by e-mail). Defaults the name from the
// signed-in account so it's usually one click away.
export function ExamSetup({ onStart, onCancel, busy }) {
  const { c, user, notify, t } = useApp();
  const [mode, setMode] = useState("test");
  const [nom, setNom] = useState(user?.name || "");
  const [pays, setPays] = useState("");
  const [countdown, setCountdown] = useState(null); // null = not counting down; 5..0 while the intro plays
  const pendingRef = useRef(null); // validated payload, handed to onStart once the countdown ends

  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;

  const submit = () => {
    if (!nom.trim()) return notify(t("Entrez votre nom pour continuer."));
    if (!pays) return notify(t("Sélectionnez votre pays pour continuer."));
    const payload = { mode, nom: nom.trim(), pays };
    window.scrollTo({ top: 0 }); // so the exam mounts already at the top, no leftover scroll offset
    // The countdown intro is a Mode Test ritual (real-exam pressure before the
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

      <Card className="p-6 md:p-8">
        <div className="text-center mb-7">
          <h3 className={`font-display font-bold text-xl ${c.text}`}>{t("Choisissez votre mode")}</h3>
          <p className={`text-sm mt-1 ${c.sub}`}>{t("Sélectionnez le mode qui correspond à vos besoins.")}</p>
        </div>

        {/* Mode cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {EXAM_MODES.map((m) => {
            const active = m.id === mode;
            const accent = m.badgeTone === "red";
            return (
              <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={active}
                className={`text-left p-5 rounded-3xl border-2 transition-all relative
                ${active ? (accent ? "border-rose-500 bg-rose-500/5" : "border-amber-500 bg-amber-500/5") : `${c.border} ${c.hoverSoft}`}`}>
                <span className="absolute top-4 right-4"><Pill tone={m.badgeTone}>{t(m.badge)}</Pill></span>
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${accent ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}><m.icon size={20} /></span>
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

        {/* Candidate info */}
        <div className={`border-t ${c.border} mt-7 pt-6`}>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ex-nom" className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}>{t("Nom")}</label>
              <input id="ex-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t("Votre nom")} className={inp} />
            </div>
            <div>
              <label htmlFor="ex-pays" className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${c.sub}`}>{t("Pays")}</label>
              <select id="ex-pays" value={pays} onChange={(e) => setPays(e.target.value)} className={inp}>
                <option value="">{t("Sélectionnez votre pays")}</option>
                {COUNTRIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        <Btn variant="accent" className="w-full mt-6" icon={ArrowRight} disabled={busy || countdown !== null} onClick={submit}>{t(busy ? "Génération…" : "Commencer le test")}</Btn>
        <p className={`text-xs text-center mt-3 ${c.faint}`}>{t("Le chronomètre démarre dès la première question. Score calculé automatiquement.")}</p>
      </Card>

      {/* Countdown intro (Mode Test only): blocks interaction for a beat before
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
