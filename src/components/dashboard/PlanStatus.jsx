import { Crown, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/common";
import { ROLES, isStaff } from "@/auth/rbac";
import { currentPlanLabel } from "@/constants/pricing";

// The account's plan, where a signed-in member can always see it: the
// dashboard's header and the profile's identity card. « Tarifs » left the
// navbar for signed-in accounts, so this is their way to the pricing page.
//
// Free account: a « Compte gratuit » badge and the upgrade button. Paid pass:
// its name and end date, and a quiet « Prolonger » — a pass is a one-time
// purchase that does not renew, so extending it is buying another. Staff
// without a pass see nothing.
const fmtDate = (iso) => new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });

export function PlanStatus({ className = "" }) {
  const { c, t, nav, user, role } = useApp();
  if (!user) return null;
  const paid = role === ROLES.PREMIUM_USER || (isStaff(role) && user.plan === "Premium");
  if (!paid && isStaff(role)) return null;
  const chip = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${c.border}`;
  if (!paid) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <span className={`${chip} ${c.sub}`}>{t("Compte gratuit")}</span>
        <Btn small variant="accent" icon={Crown} onClick={() => nav("pricing")}>{t("Passer à un accès complet")}</Btn>
      </div>
    );
  }
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className={`${chip} text-blue-600`}><Crown size={13} /> {currentPlanLabel(user.planLabel) || "Premium"}</span>
      {user.premiumUntil && <span className={`text-xs ${c.sub}`}>{t("jusqu'au")} {fmtDate(user.premiumUntil)}</span>}
      <button type="button" onClick={() => nav("pricing")} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:gap-1.5 transition-all">
        {t("Prolonger")} <ArrowRight size={13} />
      </button>
    </div>
  );
}
