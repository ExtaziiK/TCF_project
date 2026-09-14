import { MemberHome } from "@/components/dashboard/MemberHome";

// The one page a signed-in user lands on. "/" used to render this same
// component too, under a different eyebrow — one screen behind two addresses.
// Now "/" redirects here (see Home.jsx) and this is the only door.
export function Dashboard() {
  return <MemberHome />;
}
