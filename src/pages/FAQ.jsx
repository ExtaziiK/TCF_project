import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { FAQS } from "@/constants/faq";
import { useIsAlgeria } from "@/hooks/useIsAlgeria";

export function FAQ() {
  const { c, t, nav } = useApp();
  const dz = useIsAlgeria();
  // The CCP / BaridiMob question is for visitors from Algeria only.
  const faqs = FAQS.filter((f) => !f.dzOnly || dz);
  const [open, setOpen] = useState(0);
  return (
    <PageShell back eyebrow={t("Foire aux questions")} title={t("Tout ce qu'il faut savoir avant de commencer")}>
      <div className="space-y-3 max-w-3xl">
        {faqs.map((f, i) => (
          <Card key={f.q} className="overflow-hidden">
            <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className={`w-full flex items-center justify-between gap-4 px-6 py-5 text-left ${c.hoverSoft}`}>
              <span className={`font-semibold text-sm md:text-base ${c.text}`}>{t(f.q)}</span>
              <ChevronDown size={18} className={`shrink-0 text-blue-600 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className={`px-6 pb-6 text-sm leading-relaxed ${c.sub} rise`}>
                <p>{t(f.a)}</p>
                {f.steps && (
                  <ol className="mt-4 space-y-2.5">
                    {f.steps.map((s, k) => (
                      <li key={k} className="flex gap-3">
                        <span className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{k + 1}</span>
                        <span className={`pt-0.5 ${c.text}`}>{t(s)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {/* Rendered only while the question is open, so the page
                    never downloads a recording nobody asked to see. */}
                {f.gif && (
                  <img src={f.gif.src} width={f.gif.width} height={f.gif.height} alt={t(f.gif.alt)} loading="lazy"
                    className={`mt-5 h-auto rounded-2xl border ${c.border} ${f.gif.width > 360 ? "w-full max-w-md" : "w-full max-w-[280px]"}`} />
                )}
                {f.link && (
                  <div className="mt-5"><Btn small onClick={() => nav(f.link.route)}>{t(f.link.label)}</Btn></div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
