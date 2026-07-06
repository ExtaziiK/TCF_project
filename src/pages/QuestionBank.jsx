import { BankExplorer } from "@/components/bank/BankExplorer";

// Admin-only view over the whole bank (the route is gated to ADMIN by the
// route guard). Premium users reach the same content through the per-module
// pages (Compréhension orale, etc.), which render BankExplorer locked to
// their section.
export function QuestionBank() {
  return (
    <BankExplorer
      eyebrow="Banque de questions"
      title="Tous vos quiz, classés par épreuve"
      sub="Les quiz sont chargés automatiquement depuis les dossiers de la banque : déposez un fichier JSON dans le dossier d'une épreuve et il apparaît ici."
    />
  );
}
