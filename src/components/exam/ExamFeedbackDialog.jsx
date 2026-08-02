import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, Card, StarRating } from "@/components/common";
import { submitTestimonial, MIN_BODY, MAX_BODY } from "@/services/testimonialsService";

// Asked once, right after a candidate's first TCF blanc — the moment they have
// an opinion and before they close the tab.
//
// Dismissible on purpose, and dismissing counts: someone who has just finished
// a two-hour exam does not owe us a review, and a modal they cannot escape is
// the fastest way to make them resent one. `onClose` fires either way so the
// caller stops asking.
//
// What is collected lands in `testimonials` as PENDING, like every other
// submission — RLS refuses any other status — so nothing reaches the avis page
// without an admin approving it.
export function ExamFeedbackDialog({ onClose }) {
  const { c, t, user, notify } = useApp();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(null);

  // Escape closes it, like every other dialog on the site.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!rating) return notify(t("Choisissez une note avant d'envoyer."), "error");
    if (body.trim().length < MIN_BODY) {
      return notify(`${t("Votre commentaire doit faire au moins")} ${MIN_BODY} ${t("caractères.")}`, "error");
    }
    setBusy(true);
    try {
      const r = await submitTestimonial({
        name: user?.name || user?.username || "Membre",
        body: body.trim(),
        rating,
      });
      if (!r.ok) return notify(r.error || t("L'envoi a échoué. Réessayez dans un instant."), "error");
      notify(t("Merci ! Votre avis sera publié après validation."));
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <Card className="w-full max-w-lg p-7 rise relative">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("Fermer")}
          className={`absolute top-4 right-4 p-1.5 rounded-lg ${c.sub} ${c.hoverSoft}`}
        >
          <X size={18} />
        </button>

        <h2 id="feedback-title" className={`font-display font-bold text-xl pr-8 ${c.text}`}>
          {t("Bravo pour ce premier TCF blanc !")}
        </h2>
        <p className={`mt-2 text-sm ${c.sub}`}>
          {t("Votre avis aide les futurs candidats à se décider. Il sera publié après validation.")}
        </p>

        <form className="mt-6" onSubmit={submit}>
          <p className={`text-sm font-semibold ${c.text}`}>{t("Votre note")}</p>
          <div className="mt-2">
            <StarRating value={rating} onChange={setRating} size={30} />
          </div>

          <label htmlFor="feedback-body" className={`block mt-6 text-sm font-semibold ${c.text}`}>
            {t("Votre commentaire")}
          </label>
          <textarea
            id="feedback-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
            rows={4}
            placeholder={t("Ce qui vous a aidé, ce qui pourrait être amélioré…")}
            className={`mt-2 w-full p-3 rounded-2xl border text-sm resize-y ${c.inputCls}`}
          />
          <p className={`mt-1.5 text-xs ${c.faint}`}>{body.trim().length} / {MAX_BODY}</p>

          <div className="mt-6 flex gap-3 flex-wrap">
            <Btn type="submit" variant="accent" disabled={busy}>{t(busy ? "Envoi…" : "Envoyer mon avis")}</Btn>
            <Btn type="button" variant="ghost" onClick={onClose}>{t("Plus tard")}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
