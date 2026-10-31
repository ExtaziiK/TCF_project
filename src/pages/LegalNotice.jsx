import { useApp } from "@/context/AppContext";
import { PageShell, Card } from "@/components/common";
import { LegalNoticeBody } from "@/components/legal/LegalNoticeBody";

// Public, linkable legal notice (footer). Same shape as the Terms, Privacy and
// Accessibility pages so the four read as one set.
export function LegalNotice() {
  const { t } = useApp();
  return (
    <PageShell
      back
      eyebrow={t("Mentions légales")}
      title={t("Mentions légales")}
      sub={t("Qui édite Passerelle, qui l'héberge, et à qui appartiennent ses contenus.")}
    >
      <Card className="p-7 md:p-9">
        <LegalNoticeBody />
      </Card>
    </PageShell>
  );
}
