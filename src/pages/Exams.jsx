import { BankExplorer } from "@/components/bank/BankExplorer";
import { WritingWorkshopBody } from "@/pages/Writing";
import { SpeakingStudioBody } from "@/pages/Speaking";

// The unified "Mes examens" hub. The four TCF épreuves (compréhension orale
// & écrite, expression orale & écrite) all live here, switched with the tabs
// on top of the quiz grid. Access is gated by the route guard: premium/admin
// play everything, free users get quiz 1 of each épreuve and locks on the
// rest (handled inside BankExplorer), visitors hit the register gate.
//
// EE/EO have no MCQ quizzes in the bank — their "exam" is the expression
// workshop. We hand those bodies to BankExplorer via `workshops` so the tab
// renders the studio instead of an empty grid (passing them as props keeps
// BankExplorer from importing the workshop pages, avoiding an import cycle).
export function Exams() {
  return (
    <BankExplorer
      back
      sections={["co", "ce", "eo", "ee"]}
      workshops={{ ee: <WritingWorkshopBody />, eo: <SpeakingStudioBody /> }}
      eyebrow="Mes examens"
      title="Vos quatre épreuves, réunies en un seul endroit"
      sub="Compréhension et expression, à l'oral comme à l'écrit. Choisissez une épreuve ci-dessous, puis lancez un quiz dans les conditions réelles de l'examen."
    />
  );
}
