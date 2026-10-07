import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { FAQS, faqHash } from "@/constants/faq";
import { useIsAlgeria } from "@/hooks/useIsAlgeria";

// Links to one question from elsewhere on the site: goes to the FAQ with that
// question open (its #id in the address, so the link can also be shared).
export function openFaq(nav, id) {
  nav("faq");
  window.history.replaceState(window.history.state, "", window.location.pathname + faqHash(id));
}

const hashId = () => {
  try { return decodeURIComponent(window.location.hash.slice(1)); } catch { return ""; }
};

export function FAQ() {
  const { c, t, nav } = useApp();
  const dz = useIsAlgeria();
  // The CCP / BaridiMob question is for visitors from Algeria only.
  const faqs = FAQS.filter((f) => !f.dzOnly || dz);
  // /faq#<id> opens that question; otherwise the first one, as before.
  const [open, setOpen] = useState(() => {
    const i = faqs.findIndex((f) => f.id === hashId());
    return i >= 0 ? i : 0;
  });
  // …and brings it into view, once the page has laid out. Also when only the
  // #id changes on an FAQ already open (a second link, or the back button).
  useEffect(() => {
    let timer;
    const follow = () => {
      const id = hashId();
      if (!id) return;
      const i = faqs.findIndex((f) => f.id === id);
      if (i >= 0) setOpen(i);
      clearTimeout(timer);
      timer = setTimeout(() => document.getElementById(`faq-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => { clearTimeout(timer); window.removeEventListener("hashchange", follow); };
  }, [faqs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <PageShell back eyebrow={t("Foire aux questions")} title={t("Tout ce qu'il faut savoir avant de commencer")}>
      <div className="space-y-3 max-w-3xl">
        {faqs.map((f, i) => (
          <Card key={f.q} id={f.id ? `faq-${f.id}` : undefined} className="overflow-hidden scroll-mt-24">
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
