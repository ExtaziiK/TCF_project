import { useApp } from "@/context/AppContext";
import { MIN_PASSWORD, passwordStrength, passwordHint } from "@/services/authService";

// The same gradient as the accent CTA ("Créer mon compte"), so the bar reads as
// part of the brand rather than a stoplight. Strength is shown by how far the
// fill travels AND how solid it is: faded at "Faible", fully saturated at
// "Excellent".
const GRADIENT = "linear-gradient(90deg,#2E6BE6,#D8354A)";

const LEVELS = [
  { label: "Trop court", opacity: 0.3 },
  { label: "Faible", opacity: 0.45 },
  { label: "Moyen", opacity: 0.65 },
  { label: "Fort", opacity: 0.85 },
  { label: "Excellent", opacity: 1 },
];

// Guidance, never a gate: the only hard rule is MIN_PASSWORD (see
// authService.validatePassword). Renders nothing on an empty field so the form
// doesn't shout at someone who hasn't started typing.
export function PasswordMeter({ password, email, username, className = "" }) {
  const { c, t } = useApp();
  if (!password) return null;

  const score = passwordStrength(password, { email, username });
  const level = LEVELS[score];
  const hint = passwordHint(password, { email, username });
  const pct = Math.max(8, (score / 4) * 100); // a sliver always shows, so the bar reads as a bar

  return (
    <div className={`mt-2 ${className}`}>
      <div className={`h-1.5 rounded-full overflow-hidden ${c.track}`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: GRADIENT, opacity: level.opacity }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-label={t("Force du mot de passe")}
        />
      </div>
      <p className={`mt-1.5 text-xs flex items-center justify-between gap-3 ${c.faint}`}>
        <span>{hint ? t(hint) : t("La longueur compte plus que les caractères spéciaux.")}</span>
        <span className={`font-semibold shrink-0 ${score >= 3 ? "text-emerald-600" : score === 0 ? "text-rose-600" : c.sub}`}>
          {t(level.label)}
        </span>
      </p>
      {password.length < MIN_PASSWORD && (
        <p className="mt-1 text-xs text-rose-600">{t(`Minimum ${MIN_PASSWORD} caractères.`)}</p>
      )}
    </div>
  );
}
