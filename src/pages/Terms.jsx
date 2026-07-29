import { useApp } from "@/context/AppContext";
import { PageShell, Card } from "@/components/common";
import { TermsBody } from "@/components/legal/TermsBody";

// Public, linkable copy of the conditions (footer + the registration dialog's
// "ouvrir dans un onglet" link). The same TermsBody the signup dialog shows.
export function Terms() {
  const { t } = useApp();
  return (
    <PageShell
      back
      eyebrow={t("Mentions légales")}
      title={t("Conditions générales d'utilisation")}
      sub={t("Les règles d'utilisation de Passerelle, à lire avant de créer un compte.")}
    >
      <Card className="p-7 md:p-9">
        <TermsBody />
      </Card>
    </PageShell>
  );
}
