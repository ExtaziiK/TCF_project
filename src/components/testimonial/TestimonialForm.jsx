import { useState } from "react";
import { EyeOff } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn, StarRating } from "@/components/common";
import { submitTestimonial, MIN_BODY, MAX_BODY, ANONYMOUS_NAME } from "@/services/testimonialsService";

// The one review form, used in both places a member can leave one: the dialog
// after their first TCF blanc (ExamFeedbackDialog) and "Mon témoignage" on the
// profile page. Both write the same `testimonials` row and, once an admin
// approves it, it shows on the Avis page (and may be picked for the home
// carousel) — so the two must ask for the same things. They used to differ: the
// profile had no stars (its reviews never counted in the Avis average) and no
// way to hide the name; the dialog had no journey or result.
//
// Everything is saved PENDING (RLS refuses any other status).

export const RESULT_LEVELS = ["", "A2 obtenu", "B1 obtenu", "B2 obtenu", "C1 obtenu", "C2 obtenu"];

export function TestimonialForm({ onSent, submitLabel = "Envoyer mon avis", children }) {
  const { c, t, user, notify } = useApp();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [origin, setOrigin] = useState("");
  const [level, setLevel] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const realName = user?.name || user?.username || "Membre";
  const inp = `w-full px-4 py-3 rounded-2xl border text-sm outline-none focus:border-blue-600 ${c.inputCls}`;
  const label = `block text-sm font-semibold ${c.text}`;
  const length = body.trim().length;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!rating) return notify(t("Choisissez une note avant d'envoyer."), "error");
    if (length < MIN_BODY) return notify(`${t("Votre commentaire doit faire au moins")} ${MIN_BODY} ${t("caractères.")}`, "error");
    setBusy(true);
    try {
      const r = await submitTestimonial({ name: realName, body: body.trim(), origin, level, rating, anonymous });
      if (!r.ok) return notify(t(r.error || "L'envoi a échoué. Réessayez dans un instant."), "error");
      notify(t("Merci ! Votre avis sera publié après validation par notre équipe."));
      setRating(0); setBody(""); setOrigin(""); setLevel(""); setAnonymous(false);
      onSent?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <p className={label}>{t("Votre note")}</p>
      <div className="mt-2">
        <StarRating value={rating} onChange={setRating} size={30} />
      </div>

      <label htmlFor="testimonial-body" className={`${label} mt-5`}>{t("Votre commentaire")}</label>
      <textarea
        id="testimonial-body"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
        rows={4}
        placeholder={t("Ce qui vous a le plus aidé, ce qui vous a surpris, ce que vous diriez à un candidat qui hésite encore…")}
        className={`${inp} mt-2 resize-y`}
      />
      <p className={`mt-1.5 text-xs ${length > 0 && length < MIN_BODY ? "text-amber-600" : c.faint}`}>{length} / {MAX_BODY}</p>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="testimonial-origin" className={label}>{t("Votre parcours")} <span className={`font-normal ${c.faint}`}>({t("facultatif")})</span></label>
          <input id="testimonial-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} maxLength={80}
            placeholder={t("Ex. : Casablanca → Montréal")} className={`${inp} mt-2`} />
        </div>
        <div>
          <label htmlFor="testimonial-level" className={label}>{t("Résultat obtenu")} <span className={`font-normal ${c.faint}`}>({t("facultatif")})</span></label>
          <select id="testimonial-level" value={level} onChange={(e) => setLevel(e.target.value)} className={`${inp} mt-2`}>
            {RESULT_LEVELS.map((l) => <option key={l} value={l}>{l || t("Ne pas préciser")}</option>)}
          </select>
        </div>
      </div>

      {/* Opt-out on the name, stated in terms of what will actually appear
          under the review — "masquer mon nom" alone leaves people guessing
          what replaces it, and guessing is what stops them from writing. */}
      <div className={`mt-5 p-3.5 rounded-2xl border ${c.border}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="sr-only peer" />
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
        <Btn type="submit" variant="accent" disabled={busy}>{t(busy ? "Envoi…" : submitLabel)}</Btn>
        {children}
      </div>
    </form>
  );
}
