import { Mail } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";

// Admin › Emails — placeholder. The transactional emails are not edited here
// yet: the account emails (confirmation d'inscription, réinitialisation du mot
// de passe) are sent by Supabase Auth and edited in its dashboard, and the
// renewal reminders are still worded in api/_lib/mailer.js. The tab is kept so
// the section exists once the Hostinger mailbox is wired up to it.
export function EmailTemplatesTab() {
  const { c } = useApp();
  return (
    <Card className="p-10 text-center">
      <span className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mx-auto">
        <Mail size={22} />
      </span>
      <p className={`font-display font-bold text-lg mt-4 ${c.text}`}>Les emails s'afficheront ici plus tard</p>
      <p className={`text-sm mt-2 max-w-md mx-auto ${c.sub}`}>
        Cette section accueillera la gestion des emails. En attendant, les modèles se modifient dans le tableau de bord
        Supabase (Authentication → Email Templates).
      </p>
    </Card>
  );
}
