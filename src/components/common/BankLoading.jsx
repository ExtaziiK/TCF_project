import { RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common/Card";
import { Btn } from "@/components/common/Btn";
import { LogoLoader } from "@/components/common/LogoLoader";

// Shown while a quiz chunk downloads (services/bankService loads the bank on
// demand), with the Passerelle logo animation (LogoLoader). `error` = the download failed: offer a retry rather than a spinner
// that never ends. Extra props (data-tour…) land on a wrapper, so a guided-tour
// target stays in the page while its content loads.
export function BankLoading({ error, onRetry, label = "Chargement des questions…", className = "", ...rest }) {
  const { c, t } = useApp();
  return (
    <div {...rest}>
    <Card className={`p-8 flex flex-col items-center justify-center gap-3 text-center ${className}`}>
      {error ? (
        <>
          <p className={`text-sm ${c.sub}`}>{t("Impossible de charger les questions. Vérifiez votre connexion.")}</p>
          {onRetry && <Btn small variant="ghost" icon={RefreshCw} onClick={onRetry}>{t("Réessayer")}</Btn>}
        </>
      ) : (
        <>
          <LogoLoader className="w-72 max-w-full sm:w-96" />
          <span className={`text-sm font-medium ${c.faint}`}>{t(label)}</span>
        </>
      )}
    </Card>
    </div>
  );
}
