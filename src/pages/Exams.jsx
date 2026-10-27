import { useApp } from "@/context/AppContext";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { WritingWorkshopBody } from "@/pages/Writing";
import { SpeakingStudioBody } from "@/pages/Speaking";

// The unified "Épreuves" hub. The four TCF épreuves (compréhension orale
// & écrite, expression orale & écrite) all live here, switched with the tabs
// on top of the quiz grid. Access is gated by the route guard: premium/admin
// play everything, free users get the first 3 quizzes of each épreuve and locks on the
// rest (handled inside BankExplorer), visitors hit the register gate.
//
// EE/EO have no MCQ quizzes in the bank — their "exam" is the expression
// workshop. We hand those bodies to BankExplorer via `workshops` so the tab
// renders the studio instead of an empty grid (passing them as props keeps
// BankExplorer from importing the workshop pages, avoiding an import cycle).
//
// The old per-épreuve addresses (/comprehension-orale, /comprehension-ecrite,
// /expression-ecrite, /expression-orale) and the old free-practice page now
// render this hub too (pages/index.jsx), opened on the matching tab — so every
// link to them lands in the current design.
const TAB_FOR_ROUTE = { listening: "co", reading: "ce", writing: "ee", speaking: "eo" };

export function Exams() {
  const { route } = useApp();
  return (
    <BankExplorer
      back
      sections={["co", "ce", "eo", "ee"]}
      initialSection={TAB_FOR_ROUTE[route]}
      workshops={{ ee: <WritingWorkshopBody />, eo: <SpeakingStudioBody /> }}
      eyebrow="Épreuves"
      title="Vos quatre épreuves, réunies en un seul endroit"
      sub="Compréhension et expression, à l'oral comme à l'écrit. Choisissez une épreuve ci-dessous, puis lancez un quiz dans les conditions réelles de l'examen."
    />
  );
}
