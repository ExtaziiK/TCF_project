import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card } from "@/components/common";
import { FAQS } from "@/constants/faq";

export function FAQ() {
  const { c, t } = useApp();
  const [open, setOpen] = useState(0);
  return (
    <PageShell back eyebrow={t("Foire aux questions")} title={t("Tout ce qu'il faut savoir avant de commencer")}>
      <div className="space-y-3 max-w-3xl">
        {FAQS.map((f, i) => (
          <Card key={f.q} className="overflow-hidden">
            <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className={`w-full flex items-center justify-between gap-4 px-6 py-5 text-left ${c.hoverSoft}`}>
              <span className={`font-semibold text-sm md:text-base ${c.text}`}>{t(f.q)}</span>
              <ChevronDown size={18} className={`shrink-0 text-blue-600 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <p className={`px-6 pb-6 text-sm leading-relaxed ${c.sub} rise`}>{t(f.a)}</p>}
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
