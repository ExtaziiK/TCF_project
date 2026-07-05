import { Leaf, ArrowRight, Play, ChevronRight, Quote } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, Pill, Btn, SectionHead, LevelRibbon } from "@/components/common";
import { DemoQuestion } from "@/components/home/DemoQuestion";
import { PlanCard } from "@/components/pricing/PlanCard";
import { STATS, FEATURES, WHY, TESTIMONIALS } from "@/constants/home";
import { PLANS } from "@/constants/pricing";
import { MOCK_SECTIONS } from "@/constants/mocks";

export function Home() {
  const { c, nav } = useApp();
  return (
    <main className="pt-16 md:pt-[72px]">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: "radial-gradient(circle,#2E6BE6,transparent 65%)" }} />
          <div className="absolute -bottom-40 -right-24 w-[420px] h-[420px] rounded-full opacity-15" style={{ background: "radial-gradient(circle,#D8354A,transparent 65%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 md:pt-24 pb-16 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
          <div>
            <Pill tone="red" className="rise"><Leaf size={12} /> Reconnu pour Entrée express & la citoyenneté</Pill>
            <h1 className={`font-display font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[1.05] mt-5 ${c.text} rise rise-1`}>
              Le français qui vous ouvre <span className="grad-text">le Canada.</span>
            </h1>
            <p className={`mt-6 text-lg md:text-xl leading-relaxed ${c.sub} max-w-lg rise rise-2`}>
              Préparez les quatre épreuves du TCF Canada avec des questions au format officiel, des corrections d'enseignants et un suivi de niveau CECR en temps réel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 rise rise-3">
              <Btn variant="accent" icon={ArrowRight} onClick={() => nav("practice")}>Commencer à pratiquer</Btn>
              <Btn variant="ghost" icon={Play} onClick={() => nav("mocks")}>Voir un examen blanc</Btn>
            </div>
            <div className={`mt-10 p-5 rounded-3xl border ${c.border} ${c.card} rise rise-4`}>
              <LevelRibbon current="B1" target="B2" />
              <p className={`mt-3 text-xs ${c.faint}`}>Votre niveau est réévalué après chaque session de pratique.</p>
            </div>
          </div>
          <div className="rise rise-2"><DemoQuestion /></div>
        </div>
      </section>

      {/* STATS */}
      <section className={`border-y ${c.border} ${c.tint}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.l} className="text-center">
              <p className="font-display font-extrabold text-3xl md:text-4xl grad-text">{s.n}</p>
              <p className={`mt-1.5 text-sm ${c.sub}`}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
        <SectionHead center eyebrow="Modules de pratique" title="Les quatre épreuves, un seul endroit" sub="Chaque module reproduit fidèlement le format, le minutage et le barème du TCF Canada." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <button key={f.t} onClick={() => nav(f.route)} className="text-left">
              <Card lift className="p-6 h-full">
                <span className="w-12 h-12 rounded-2xl grad-brand text-white flex items-center justify-center shadow-lg shadow-blue-600/25"><f.icon size={22} /></span>
                <h3 className={`font-display font-bold text-lg mt-5 ${c.text}`}>{f.t}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${c.sub}`}>{f.d}</p>
                <p className="mt-4 text-sm font-semibold text-blue-600 flex items-center gap-1">Pratiquer <ArrowRight size={14} /></p>
              </Card>
            </button>
          ))}
        </div>
      </section>

      {/* EXAM OVERVIEW */}
      <section className={`${c.tint} border-y ${c.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <SectionHead eyebrow="L'épreuve en bref" title="Comprendre le TCF Canada" sub="Un test unique, quatre épreuves obligatoires, un score sur 699 points converti en niveaux NCLC pour votre dossier IRCC." />
            <div className="space-y-3">
              {MOCK_SECTIONS.map((s) => (
                <div key={s.t} className={`flex items-center gap-4 p-4 rounded-2xl border ${c.border} ${c.card}`}>
                  <span className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0"><s.icon size={18} /></span>
                  <div className="flex-1"><p className={`font-semibold text-sm ${c.text}`}>{s.t}</p><p className={`text-xs font-mono2 ${c.faint}`}>{s.d}</p></div>
                  <ChevronRight size={16} className={c.faint} />
                </div>
              ))}
            </div>
          </div>
          <Card className="p-7 md:p-9">
            <h3 className={`font-display font-bold text-xl ${c.text} mb-6`}>Pourquoi nous choisir</h3>
            <div className="space-y-6">
              {WHY.map((w) => (
                <div key={w.t} className="flex gap-4">
                  <span className="w-10 h-10 rounded-xl bg-rose-600/10 text-rose-600 flex items-center justify-center shrink-0"><w.icon size={18} /></span>
                  <div><p className={`font-semibold ${c.text}`}>{w.t}</p><p className={`text-sm mt-1 ${c.sub}`}>{w.d}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* TESTIMONIALS / SUCCESS STORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
        <SectionHead center eyebrow="Histoires de réussite" title="Ils ont obtenu leur niveau. À vous maintenant." />
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} lift className="p-6 flex flex-col">
              <Quote size={22} className="text-blue-600/40" aria-hidden="true" />
              <p className={`mt-4 text-sm leading-relaxed flex-1 ${c.text}`}>« {t.text} »</p>
              <div className="mt-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full grad-brand text-white text-sm font-bold flex items-center justify-center">{t.name[0]}</span>
                <div className="flex-1"><p className={`text-sm font-bold ${c.text}`}>{t.name}</p><p className={`text-xs ${c.faint}`}>{t.from}</p></div>
                <Pill tone="green">{t.level}</Pill>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className={`${c.tint} border-y ${c.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24">
          <SectionHead center eyebrow="Tarifs" title="Commencez gratuitement, progressez en Premium" sub="Sans engagement. Annulable en deux clics. Garantie 30 jours sur l'abonnement annuel." />
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {PLANS.map((p) => <PlanCard key={p.name} p={p} compact />)}
          </div>
          <div className="text-center mt-8"><Btn variant="ghost" onClick={() => nav("pricing")} icon={ArrowRight}>Comparer les forfaits en détail</Btn></div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
        <h2 className={`font-display font-extrabold text-3xl md:text-5xl ${c.text}`}>Votre passerelle vers le Canada<br /><span className="grad-text">commence aujourd'hui.</span></h2>
        <p className={`mt-5 text-lg ${c.sub}`}>10 questions gratuites par jour. Aucune carte bancaire requise.</p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Btn variant="accent" icon={ArrowRight} onClick={() => nav("register")}>Créer mon compte gratuit</Btn>
        </div>
      </section>
    </main>
  );
}
