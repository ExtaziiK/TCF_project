import { BankExplorer } from "@/components/bank/BankExplorer";

// The unified "Mes examens" hub. The four TCF épreuves (compréhension orale
// & écrite, expression orale & écrite) all live here, switched with the tabs
// on top of the quiz grid. Access is gated by the route guard: premium/admin
// play everything, free users get quiz 1 of each épreuve and locks on the
// rest (handled inside BankExplorer), visitors hit the register gate.
export function Exams() {
  return (
    <BankExplorer
      back
      sections={["co", "ce", "eo", "ee"]}
      eyebrow="Mes examens"
      title="Vos quatre épreuves, réunies en un seul endroit"
      sub="Compréhension et expression, à l'oral comme à l'écrit. Choisissez une épreuve ci-dessous, puis lancez un quiz dans les conditions réelles de l'examen."
    />
  );
}
