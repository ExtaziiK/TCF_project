import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, Card } from "@/components/common";
import { TestimonialForm } from "@/components/testimonial/TestimonialForm";

// Asked right after a candidate's first TCF blanc — the moment they have an
// opinion and before they close the tab — and again after a later exam if they
// answered "Plus tard" the first time.
//
// Dismissible on purpose: someone who has just finished a two-hour exam does
// not owe us a review, and a modal they cannot escape is the fastest way to
// make them resent one.
//
// `onClose` always fires, carrying WHY it closed — "sent", "later" (Plus tard)
// or "dismissed" (✕ / Escape). The caller decides what each is worth; only
// "later" brings the dialog back after another exam.
//
// What is collected lands in `testimonials` as PENDING, like every other
// submission — RLS refuses any other status — so nothing reaches the avis page
// without an admin approving it.
//
// The name is opt-out: some people will say more about a two-hour exam once
// their name is not attached to it, and a review we can publish is worth more
// than a name we cannot use.
export function ExamFeedbackDialog({ onClose }) {
  const { c, t } = useApp();
  const closeRef = useRef(null);

  // Escape closes it, like every other dialog on the site. Counted as a real
  // no, same as the ✕: reaching for Escape is not "ask me another time".
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.("dismissed"); };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <Card className="w-full max-w-lg p-7 rise relative max-h-[92dvh] overflow-y-auto">
        <button
          ref={closeRef}
          type="button"
          onClick={() => onClose?.("dismissed")}
          aria-label={t("Fermer")}
          className={`absolute top-4 right-4 p-1.5 rounded-lg ${c.sub} ${c.hoverSoft}`}
        >
          <X size={18} />
        </button>

        <h2 id="feedback-title" className={`font-display font-bold text-xl pr-8 ${c.text}`}>
          {t("Bravo pour ce premier TCF blanc !")}
        </h2>
        <p className={`mt-2 text-sm ${c.sub}`}>
          {t("Vous venez de vivre ce que des milliers de candidats redoutent. Racontez-le en deux phrases : après validation, votre avis sera publié sur notre page Avis, et c'est souvent celui d'un candidat comme vous qui décide quelqu'un à se lancer.")}
        </p>

        {/* The same form as "Mon témoignage" on the profile page. */}
        <div className="mt-6">
          <TestimonialForm onSent={() => onClose?.("sent")}>
            <Btn type="button" variant="ghost" onClick={() => onClose?.("later")}>{t("Plus tard")}</Btn>
          </TestimonialForm>
        </div>
      </Card>
    </div>
  );
}
