import { useApp } from "@/context/AppContext";
import { PageShell, Card } from "@/components/common";
import { PrivacyBody } from "@/components/legal/PrivacyBody";

// Public, linkable privacy policy (footer + referenced by the CGU). Same shape
// as the Terms page so the two legal documents read as one pair.
export function Privacy() {
  const { t } = useApp();
  return (
    <PageShell
      back
      eyebrow={t("Mentions légales")}
      title={t("Politique de confidentialité")}
      sub={t("Quelles données nous collectons, pourquoi, avec qui elles sont partagées et comment les faire supprimer.")}
    >
      <Card className="p-7 md:p-9">
        <PrivacyBody />
      </Card>
    </PageShell>
  );
}
