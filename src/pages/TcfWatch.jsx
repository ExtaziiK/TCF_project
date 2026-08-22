import { useState, useEffect, useCallback } from "react";
import { CalendarCheck, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink, Clock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill, Btn } from "@/components/common";
import { listWatchChecks, minutesSince, STALE_AFTER_MINUTES } from "@/services/tcfWatchService";

const WATCH_URL = "https://www.afmoncton.ca/en/inscription-au-tcf-canada/#/";

const fmtAgo = (mins) => {
  if (mins === null) return "—";
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
};

const fmtDmy = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// Veille TCF Moncton — a read-only window onto the exam-date watch.
//
// The checking happens on a scheduled task off-platform (see
// tcf-moncton-watch/watch.mjs and the header of 20260820_tcf_watch.sql): the
// target blocks non-browser requests and renders its calendar in JavaScript,
// this app's CSP forbids calling it, and there is no cron slot left. So this
// page renders what the watcher last recorded and never fetches the site
// itself.
//
// Which makes FRESHNESS the thing this page has to be honest about. The
// watcher runs on a PC that sleeps; "no date available" from a check nine
// hours ago is not information, and presenting it as current would be the
// exact failure this whole feature exists to avoid.
export function TcfWatch() {
  const { c, t } = useApp();
  const [state, setState] = useState({ loading: true, checks: [], backend: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    listWatchChecks(30).then(({ checks, backend }) => setState({ loading: false, checks, backend }));
  }, []);

  useEffect(load, [load]);

  const latest = state.checks[0] || null;
  const age = latest ? minutesSince(latest.checkedAt) : null;
  const stale = age !== null && age > STALE_AFTER_MINUTES;

  return (
    <PageShell
      back
      eyebrow="Veille TCF"
      title="TCF Canada — Moncton"
      sub="Surveillance automatique des dates d'examen à l'Alliance française de Moncton."
    >
      {state.loading ? (
        <Card className="p-8 text-center"><p className={`text-sm ${c.faint}`}>Chargement…</p></Card>
      ) : state.backend === "missing" ? (
        <Card className="p-8 text-center border-2 border-amber-500/40">
          <AlertTriangle size={26} className="mx-auto text-amber-500" aria-hidden="true" />
          <p className={`font-display font-bold mt-4 ${c.text}`}>La veille n&apos;est pas encore installée</p>
          <p className={`text-sm mt-2 ${c.sub}`}>
            La table <code className="font-mono2">tcf_watch_checks</code> n&apos;existe pas dans cette base.
            Appliquez la migration <code className="font-mono2">20260820_tcf_watch.sql</code>, puis lancez une
            vérification depuis le poste qui héberge la veille.
          </p>
        </Card>
      ) : !latest ? (
        <Card className="p-8 text-center">
          <Clock size={26} className={`mx-auto ${c.faint}`} aria-hidden="true" />
          <p className={`font-display font-bold mt-4 ${c.text}`}>Aucune vérification enregistrée</p>
          <p className={`text-sm mt-2 ${c.sub}`}>
            La table existe mais elle est vide : la veille n&apos;a pas encore tourné, ou elle n&apos;est pas
            configurée pour écrire ici.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          <Verdict latest={latest} age={age} stale={stale} />
          <Sessions latest={latest} />
          <History checks={state.checks} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Btn small variant="ghost" icon={RefreshCw} onClick={load}>{t("Actualiser")}</Btn>
        <a
          href={WATCH_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600"
        >
          Ouvrir la page d&apos;inscription <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    </PageShell>
  );
}

// The headline. Three states, never two — "je n'ai rien trouvé" and "je n'ai
// pas pu regarder" are different answers and are shown as different answers.
function Verdict({ latest, age, stale }) {
  const { c } = useApp();

  if (latest.status === "failed") {
    return (
      <Card className="p-7 border-2 border-rose-500/50">
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className={`font-display font-bold text-lg ${c.text}`}>La dernière vérification a échoué</p>
            <p className={`text-sm mt-1.5 ${c.sub}`}>
              Le calendrier n&apos;a pas pu être lu. <strong className={c.text}>Cela ne veut pas dire
              qu&apos;aucune date n&apos;est disponible</strong> — cela veut dire que la veille n&apos;a rien
              vu du tout. À vérifier à la main.
            </p>
            {latest.error && <p className={`mt-2 text-xs font-mono2 ${c.faint}`}>{latest.error}</p>}
            <p className={`mt-3 text-xs ${c.faint}`}>{fmtAgo(age)}</p>
          </div>
        </div>
      </Card>
    );
  }

  const match = latest.status === "match";
  return (
    <Card className={`p-7 border-2 ${match ? "border-emerald-500/60" : c.border}`}>
      <div className="flex items-start gap-3">
        {match
          ? <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          : <CalendarCheck size={22} className={`shrink-0 mt-0.5 ${c.faint}`} aria-hidden="true" />}
        <div className="flex-1">
          <p className={`font-display font-bold text-lg ${c.text}`}>
            {match
              ? `Une date est disponible avant le ${fmtDmy(latest.cutoff)} !`
              : `Aucune date avant le ${fmtDmy(latest.cutoff)}`}
          </p>
          {match ? (
            <>
              <ul className="mt-3 flex flex-wrap gap-2">
                {latest.qualifying.map((s) => (
                  <li key={s.iso}><Pill tone="green">{s.dmy}</Pill></li>
                ))}
              </ul>
              <p className={`mt-3 text-sm font-semibold text-emerald-600`}>
                Réservez maintenant — une place libérée est presque toujours une annulation, elle repart vite.
              </p>
            </>
          ) : (
            <p className={`text-sm mt-1.5 ${c.sub}`}>
              {latest.sessionCount} session{latest.sessionCount > 1 ? "s" : ""} proposée
              {latest.sessionCount > 1 ? "s" : ""}, la plus proche le{" "}
              <strong className={c.text}>{fmtDmy(latest.earliestBookable)}</strong>. Les sessions complètes
              ne sont pas affichées par le site : une annulation les fait réapparaître.
            </p>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Pill tone={stale ? "amber" : "slate"}>
              <Clock size={12} aria-hidden="true" /> Vérifié {fmtAgo(age)}
            </Pill>
            {stale && (
              <span className="text-xs text-amber-600 font-semibold">
                La veille ne tourne plus — le poste est probablement éteint ou en veille.
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Sessions({ latest }) {
  const { c } = useApp();
  if (!latest.sessions.length) return null;
  const cutoff = latest.cutoff;
  return (
    <Card className="p-7">
      <h3 className={`font-display font-bold mb-1 ${c.text}`}>Sessions actuellement proposées</h3>
      <p className={`text-sm mb-5 ${c.faint}`}>
        Toutes réservables : ce site n&apos;affiche pas les sessions complètes.
      </p>
      <ul className="flex flex-wrap gap-2">
        {latest.sessions.map((s) => (
          <li key={s.iso}>
            <Pill tone={s.iso < cutoff ? "green" : "slate"}>{s.dmy}</Pill>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function History({ checks }) {
  const { c } = useApp();
  const LABEL = {
    match: { text: "Date trouvée", tone: "green" },
    no_match: { text: "Rien avant la limite", tone: "slate" },
    failed: { text: "Échec de lecture", tone: "red" },
  };
  return (
    <Card className="p-7">
      <h3 className={`font-display font-bold mb-4 ${c.text}`}>Dernières vérifications</h3>
      <ul className="space-y-1.5 max-h-72 overflow-y-auto">
        {checks.map((chk) => {
          const l = LABEL[chk.status] || LABEL.no_match;
          return (
            <li key={chk.id} className={`flex items-center justify-between gap-3 text-sm py-1.5 border-b ${c.border}`}>
              <span className={`font-mono2 text-xs ${c.faint}`}>
                {new Date(chk.checkedAt).toLocaleString("fr-CA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className={`flex-1 ${c.sub}`}>
                {chk.status === "failed" ? "—" : `${chk.sessionCount} sessions`}
              </span>
              <Pill tone={l.tone}>{l.text}</Pill>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
