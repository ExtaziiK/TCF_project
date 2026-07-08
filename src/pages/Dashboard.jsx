import { MemberHome } from "@/components/dashboard/MemberHome";

// The dashboard route and the logged-in home render the same personal
// dashboard — one component, one data pipeline (progressService), no
// duplicated or mock content.
export function Dashboard() {
  return <MemberHome eyebrow="Tableau de bord" />;
}
