import { useApp } from "@/context/AppContext";
import { A11Y_SECTIONS, A11Y_UPDATED, A11Y_STANDARD } from "@/constants/accessibility";
import { fillOperator } from "@/constants/terms";

// The accessibility statement, rendered from constants/accessibility.js.
// Mirrors PrivacyBody: same {courriel} substitution applied after translation,
// same section shape, so the three legal documents read as one set.
//
// No draft banner here — unlike the CGU and the privacy policy, this document
// binds nobody and had no reason to be published in a provisional state. It
// went up describing the site as it actually was.
export function AccessibilityBody() {
  const { c, t } = useApp();
  return (
    <div className="space-y-7">
      <p className={`text-xs ${c.faint}`}>
        {t("Dernière mise à jour :")} {t(A11Y_UPDATED)} · {t("Objectif visé :")} {t(A11Y_STANDARD)}
      </p>
      {A11Y_SECTIONS.map((s) => (
        <section key={s.t}>
          <h2 className={`font-display font-bold text-lg ${c.text}`}>{t(s.t)}</h2>
          {s.p.map((para, i) => (
            <p key={i} className={`mt-2 text-sm leading-relaxed ${c.sub}`}>{fillOperator(t(para))}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
