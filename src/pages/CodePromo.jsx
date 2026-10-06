import { Gift, PlayCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Btn } from "@/components/common";
import { PROMO_GIFS } from "../../api/_lib/welcomeTemplate.js";

// "Comment utiliser votre code promo" — where the welcome email's promo box
// links to (/code-promo?code=TCF30). Public: the reader arrives from their
// inbox, often signed out. The same gesture as the TCF50 campaign of 2026-09
// (enquete/email-campagne.md), with the GIF re-recorded on TCF30.

// The full walkthrough down to the BaridiMob / CCP page (recorded with TCF50).
const VIDEO = "https://youtube.com/shorts/fE_bYYI8sc4";

const codeFromUrl = () => {
  try {
    const raw = new URLSearchParams(window.location.search).get("code") || "";
    return /^[A-Z0-9]{2,30}$/i.test(raw) ? raw.toUpperCase() : "";
  } catch { return ""; }
};

export function CodePromo() {
  const { c, nav } = useApp();
  const code = codeFromUrl();
  const shown = code || "VOTRECODE";
  const gif = PROMO_GIFS[code]; // only for the code it shows
  const steps = [
    <>Ouvrez la page <strong>Tarifs</strong>.</>,
    <>Vous payez en dinars ? Choisissez l&apos;onglet <strong>DZD</strong> (CCP / BaridiMob). Sinon, gardez votre devise.</>,
    <>Dans l&apos;encadré <strong>« Vous avez un code promo ? »</strong>, effacez ce qui s&apos;y trouve déjà, puis tapez <strong className="font-mono2">{shown}</strong>.</>,
    <>Appuyez sur <strong>Appliquer</strong> : un message confirme la remise et les prix baissent.</>,
    <>Choisissez votre forfait : la remise vous suit jusqu&apos;au paiement, par carte ou par CCP / BaridiMob.</>,
  ];

  return (
    <PageShell back eyebrow="Code promo" title="Comment utiliser votre code promo" sub="Cinq étapes, moins d'une minute.">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <Card className="p-6 md:p-8">
          {code && (
            <div className="mb-6 p-5 rounded-2xl border-2 border-dashed border-blue-600/60 bg-blue-600/5 text-center">
              <p className={`text-sm flex items-center justify-center gap-2 ${c.sub}`}><Gift size={16} className="text-blue-600" /> Votre code</p>
              <p className="mt-1 font-mono2 text-3xl font-extrabold tracking-[0.15em] text-blue-600">{code}</p>
            </div>
          )}
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-8 h-8 shrink-0 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <p className={`pt-1 text-[15px] leading-relaxed ${c.text}`}>{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-7 flex items-center gap-3 flex-wrap">
            <Btn onClick={() => nav("pricing")}>Aller à la page Tarifs</Btn>
            <a href={VIDEO} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
              <PlayCircle size={16} /> Voir la vidéo jusqu&apos;au paiement CCP / BaridiMob (1 min 38)
            </a>
          </div>
          <p className={`mt-4 text-xs ${c.faint}`}>
            Le code s&apos;applique au premier paiement. Si le message « code invalide » apparaît, vérifiez que le champ ne contenait pas déjà un autre code.
          </p>
        </Card>

        {gif && (
          <Card className="p-4">
            <img src={gif.src} width={gif.width} height={gif.height} alt={`Le code ${code} tapé dans « Vous avez un code promo ? », puis appliqué`} className="w-full h-auto rounded-xl border border-slate-200" />
            <p className={`mt-3 text-xs text-center ${c.faint}`}>Le code tapé, puis « Appliquer » : la remise est confirmée.</p>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
