import { useApp } from "@/context/AppContext";
import { NOTICE_SECTIONS, NOTICE_UPDATED } from "@/constants/legalNotice";
import { fillOperator } from "@/constants/terms";

// The legal notice, rendered from constants/legalNotice.js. Same shape and
// same {courriel} substitution (applied after translation) as the other legal
// bodies, so the four documents read as one set.
export function LegalNoticeBody() {
  const { c, t } = useApp();
  return (
    <div className="space-y-7">
      <p className={`text-xs ${c.faint}`}>
        {t("Dernière mise à jour :")} {t(NOTICE_UPDATED)}
      </p>
      {NOTICE_SECTIONS.map((s) => (
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
