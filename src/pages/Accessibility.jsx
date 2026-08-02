import { useApp } from "@/context/AppContext";
import { PageShell, Card } from "@/components/common";
import { AccessibilityBody } from "@/components/legal/AccessibilityBody";

// Public, linkable accessibility statement (footer, third of the legal trio).
// Same shape as the Privacy and Terms pages so the three read as one set.
export function Accessibility() {
  const { t } = useApp();
  return (
    <PageShell
      back
      eyebrow={t("Mentions légales")}
      title={t("Déclaration d'accessibilité")}
      sub={t("Ce que nous avons mis en place, ce qui ne fonctionne pas encore, et comment nous signaler un obstacle.")}
    >
      <Card className="p-7 md:p-9">
        <AccessibilityBody />
      </Card>
    </PageShell>
  );
}
