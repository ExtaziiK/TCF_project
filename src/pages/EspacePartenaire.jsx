import { useEffect, useState } from "react";
import { Copy, Check, Ticket, Wallet, TrendingUp, Users, CalendarDays, Handshake, ArrowRight, PauseCircle, School, Link2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn, Pill } from "@/components/common";
import { getPartnerSpace } from "@/services/partnerService";

// « Espace partenaire » — what an activated partner sees once signed in with the
// address they applied with (api/_lib/public/partner.js, GET): their code and
// how to share it, the sales it brought, the commission earned and paid, and,
// for a school, the seats of the agreement. Buyers are never named: a sale is a
// date, a pass and an amount. Classes and student progress come next.

const KIND_TITLES = { school: "École / centre de langues", teacher: "Professeur de français", creator: "Créateur de contenu", other: "Partenaire" };
const SOURCE_LABELS = { stripe: "Carte", dzd: "Virement" };
const METHOD_LABELS = { wise: "Wise", bank: "Virement bancaire", baridimob: "BaridiMob / CCP", cash: "Espèces", other: "Autre" };

export function EspacePartenaire() {
  const { c, t, lang, nav, user, notify } = useApp();
  const [space, setSpace] = useState(null); // null while loading
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let on = true;
    getPartnerSpace().then((r) => { if (on) setSpace(r); });
    return () => { on = false; };
  }, []);

  const locale = lang === "en" ? "en-CA" : "fr-FR";
  const money = (n, cur) => {
    try { return new Intl.NumberFormat(locale, { style: "currency", currency: cur, maximumFractionDigits: cur === "DZD" ? 0 : 2 }).format(n); } catch { return `${n} ${cur}`; }
  };
  const date = (iso) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  const month = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1800); } catch { notify(text); }
  };

  if (space === null) {
    return (
      <PageShell eyebrow={t("Espace partenaire")} title="…">
        <div className="grid sm:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className={`h-28 rounded-3xl animate-pulse ${c.track}`} />)}</div>
      </PageShell>
    );
  }

  // Not (yet) a partner: say how this page gets opened, without guessing why.
  if (!space.ok || !space.partner) {
    return (
      <PageShell eyebrow={t("Espace partenaire")} title={t("Cet espace est réservé aux partenaires")}>
        <Card className="p-7 max-w-2xl">
          <p className={`text-sm leading-relaxed ${c.sub}`}>
            {space.ok
              ? <>{t("Si votre demande de partenariat a été acceptée, connectez-vous avec l'adresse email utilisée pour la demande, et vérifiez-la si ce n'est pas déjà fait. Votre compte actuel :")} <span className={`font-semibold ${c.text}`}>{user?.email}</span>.</>
              : t(space.error || "Votre espace n'a pas pu être chargé. Réessayez dans un instant.")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Btn icon={ArrowRight} onClick={() => nav("partenaires")}>{t("Devenir partenaire")}</Btn>
            <Btn variant="ghost" onClick={() => nav("contact")}>{t("Nous contacter")}</Btn>
          </div>
        </Card>
      </PageShell>
    );
  }

  const { partner: p, summary, sales, payouts } = space;
  const shareUrl = p.code ? `${window.location.origin}/code-promo?code=${encodeURIComponent(p.code)}` : null;
  const totals = summary.totals || [];

  return (
    <PageShell eyebrow={t("Espace partenaire")} title={p.name} sub={`${t(KIND_TITLES[p.kind] || "Partenaire")} · ${t("partenaire depuis le")} ${date(p.since)}`}>
      {p.status === "paused" && (
        <Card className="p-4 mb-5 flex items-center gap-3 !border-amber-500/40 !bg-amber-500/5">
          <PauseCircle size={18} className="text-amber-600 shrink-0" />
          <p className={`text-sm ${c.text}`}>{t("Votre partenariat est en pause. Contactez-nous pour le réactiver.")}</p>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {p.code ? (
          <Card className="p-6 lg:col-span-1 min-w-0">
            <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${c.faint}`}><Ticket size={14} /> {t("Votre code")}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="flex-1 min-w-0 text-center px-4 py-3 rounded-2xl border-2 border-dashed border-blue-600 bg-blue-600/5 font-mono2 font-extrabold text-2xl tracking-[0.2em] text-blue-600 truncate">{p.code}</span>
              <button type="button" onClick={() => copy(p.code, "code")} aria-label={t("Copier le code")} className={`p-3 rounded-2xl border ${c.border} ${c.hoverSoft} ${c.sub}`}>{copied === "code" ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}</button>
            </div>
            <p className={`mt-3 text-sm ${c.sub}`}>
              {p.discountPct ? <>{t("Vos élèves obtiennent")} <strong className={c.text}>{p.discountPct} %</strong> {t("de réduction en le saisissant au paiement.")}</> : t("Vos élèves le saisissent au paiement.")}
              {p.commissionPct != null && <> {t("Vous touchez")} <strong className={c.text}>{p.commissionPct} %</strong> {t("de chaque vente.")}</>}
            </p>
            <div className="mt-4">
              <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${c.sub}`}><Link2 size={13} /> {t("Lien à partager")}</p>
              <div className="flex items-center gap-2">
                <span className={`flex-1 min-w-0 truncate text-xs font-mono2 px-3 py-2 rounded-xl border ${c.border} ${c.sub}`}>{shareUrl}</span>
                <button type="button" onClick={() => copy(shareUrl, "link")} aria-label={t("Copier le lien")} className={`p-2 rounded-xl border ${c.border} ${c.hoverSoft} ${c.sub}`}>{copied === "link" ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}</button>
              </div>
              <p className={`mt-1.5 text-xs ${c.faint}`}>{t("Ce lien montre à vos élèves comment utiliser votre code.")}</p>
            </div>
          </Card>
        ) : p.kind === "school" ? (
          <Card className="p-6 lg:col-span-1 min-w-0">
            <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${c.faint}`}><School size={14} /> {t("Votre accord")}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className={c.sub}>{t("Places élèves")}</dt><dd className={`font-semibold ${c.text}`}>{p.seats ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className={c.sub}>{t("Accès jusqu'au")}</dt><dd className={`font-semibold ${c.text}`}>{p.accessUntil ? date(p.accessUntil) : "—"}</dd></div>
            </dl>
          </Card>
        ) : null}

        <div className={`${p.code || p.kind === "school" ? "lg:col-span-2" : "lg:col-span-3"} min-w-0 space-y-5`}>
          {p.code && (
            totals.length === 0 ? (
              <Card className="p-7 text-center">
                <TrendingUp size={28} className="text-blue-600 mx-auto" />
                <p className={`mt-3 font-display font-bold ${c.text}`}>{t("Aucune vente pour l'instant")}</p>
                <p className={`mt-1 text-sm ${c.sub}`}>{t("Partagez votre code : chaque abonnement payé avec lui apparaîtra ici, avec votre commission.")}</p>
              </Card>
            ) : totals.map((b) => (
              <div key={b.currency} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  [TrendingUp, t("Ventes"), String(b.sales)],
                  [Wallet, t("Commission gagnée"), money(b.commission, b.currency)],
                  [Check, t("Déjà versée"), money(b.paid, b.currency)],
                  [CalendarDays, t("Reste à percevoir"), money(b.due, b.currency)],
                ].map(([Icon, label, value]) => (
                  <Card key={label} className="p-4 min-w-0">
                    <p className={`text-xs font-semibold flex items-center gap-1.5 ${c.faint}`}><Icon size={13} /> {label}</p>
                    <p className={`mt-2 font-display font-extrabold text-xl truncate ${c.text}`}>{value}</p>
                  </Card>
                ))}
              </div>
            ))
          )}

          {p.code && summary.months?.length > 0 && (
            <Card className="p-6">
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${c.faint}`}>{t("Par mois")}</p>
              <div className="divide-y divide-slate-500/10">
                {summary.months.map((m) => (
                  <div key={`${m.month}|${m.currency}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className={`capitalize ${c.text}`}>{month(m.month)}</span>
                    <span className={c.sub}>{m.sales} {t(m.sales > 1 ? "ventes" : "vente")}</span>
                    <span className={`font-semibold ${c.text}`}>{money(m.commission, m.currency)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {sales?.length > 0 && (
            <Card className="p-6">
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${c.faint}`}>{t("Dernières ventes")}</p>
              <div className="divide-y divide-slate-500/10">
                {sales.slice(0, 20).map((s, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 text-sm flex-wrap">
                    <span className={`w-28 shrink-0 ${c.sub}`}>{date(s.occurred_at)}</span>
                    <span className={`flex-1 min-w-0 truncate ${c.text}`}>{s.plan || t("Abonnement")}</span>
                    <Pill tone="slate">{t(SOURCE_LABELS[s.source] || s.source)}</Pill>
                    <span className={c.sub}>{money(s.amount, s.currency)}</span>
                    <span className="font-semibold text-emerald-600">+{money(s.commission, s.currency)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {payouts?.length > 0 && (
            <Card className="p-6">
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${c.faint}`}>{t("Versements reçus")}</p>
              <div className="divide-y divide-slate-500/10">
                {payouts.map((x, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 text-sm flex-wrap">
                    <span className={`w-28 shrink-0 ${c.sub}`}>{date(x.paid_at)}</span>
                    <span className={`flex-1 min-w-0 truncate ${c.sub}`}>{t(METHOD_LABELS[x.method] || "")}{x.note ? ` · ${x.note}` : ""}</span>
                    <span className={`font-semibold ${c.text}`}>{money(x.amount, x.currency)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(p.kind === "school" || p.kind === "teacher") && (
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 grid place-items-center shrink-0"><Users size={18} /></span>
                <div>
                  <p className={`font-display font-bold ${c.text}`}>{t("Vos classes")} <span className="ml-1 align-middle"><Pill tone="amber">{t("Bientôt")}</Pill></span></p>
                  <p className={`mt-1 text-sm ${c.sub}`}>{t("Créez une classe, partagez son lien d'inscription, et suivez la progression de chaque élève : quiz, scores en compréhension, TCF blancs et niveau NCLC estimé.")}</p>
                </div>
              </div>
            </Card>
          )}

          {!p.code && p.kind === "other" && (
            <Card className="p-6 flex items-start gap-3">
              <Handshake size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <p className={`text-sm ${c.sub}`}>{t("Votre partenariat est actif. Pour toute question sur notre collaboration, répondez à notre dernier email ou écrivez-nous.")}</p>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
