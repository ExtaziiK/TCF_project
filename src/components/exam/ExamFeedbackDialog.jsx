import { useEffect, useRef, useState } from "react";
import { EyeOff, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, Card, StarRating } from "@/components/common";
import { submitTestimonial, MIN_BODY, MAX_BODY, ANONYMOUS_NAME } from "@/services/testimonialsService";

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
  const { c, t, user, notify } = useApp();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(null);

  const realName = user?.name || user?.username || "Membre";

  // Escape closes it, like every other dialog on the site. Counted as a real
  // no, same as the ✕: reaching for Escape is not "ask me another time".
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.("dismissed"); };
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
        name: realName,
        body: body.trim(),
        rating,
        anonymous,
      });
      if (!r.ok) return notify(r.error || t("L'envoi a échoué. Réessayez dans un instant."), "error");
      notify(t("Merci ! Votre avis rejoindra bientôt notre page Avis."));
      onClose?.("sent");
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
          {t("Vous venez de vivre ce que des milliers de candidats redoutent. Racontez-le en deux phrases : votre avis sera publié sur notre page Avis, et c'est souvent celui d'un candidat comme vous qui décide quelqu'un à se lancer.")}
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
            placeholder={t("Ce qui vous a le plus aidé, ce qui vous a surpris, ce que vous diriez à un candidat qui hésite encore…")}
            className={`mt-2 w-full p-3 rounded-2xl border text-sm resize-y ${c.inputCls}`}
          />
          <p className={`mt-1.5 text-xs ${c.faint}`}>{body.trim().length} / {MAX_BODY}</p>

          {/* Opt-out on the name, stated in terms of what will actually appear
              under the review — "masquer mon nom" alone leaves people guessing
              what replaces it, and guessing is what stops them from writing. */}
          <div className={`mt-5 p-3.5 rounded-2xl border ${c.border}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="sr-only peer"
              />
              <span className={`mt-0.5 relative w-10 h-6 rounded-full shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/60 ${anonymous ? "bg-blue-600" : c.track}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${anonymous ? "translate-x-4" : ""}`} />
              </span>
              <span className="min-w-0">
                <span className={`flex items-center gap-1.5 text-sm font-semibold ${c.text}`}>
                  <EyeOff size={14} aria-hidden="true" /> {t("Masquer mon nom")}
                </span>
                <span className={`block mt-0.5 text-xs ${c.sub}`}>
                  {anonymous
                    ? `${t("Votre avis sera signé")} « ${t(ANONYMOUS_NAME)} ». ${t("Seule notre équipe verra votre nom.")}`
                    : `${t("Votre avis sera signé")} « ${realName} ».`}
                </span>
              </span>
            </label>
          </div>

          <div className="mt-6 flex gap-3 flex-wrap">
            <Btn type="submit" variant="accent" disabled={busy}>{t(busy ? "Envoi…" : "Envoyer mon avis")}</Btn>
            <Btn type="button" variant="ghost" onClick={() => onClose?.("later")}>{t("Plus tard")}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
