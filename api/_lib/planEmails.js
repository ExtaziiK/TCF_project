import { sendMail, mailConfigured } from "./mailer.js";
import { composeEmail } from "./emails.js";
import { profilesPhrase, longDate } from "./emailTemplates.js";
import { currentPlanLabel } from "./planLabel.js";
import { SITE } from "./welcome.js";

// The two "your plan is active" emails (Administration → Emails):
//   - premiumWelcome, after a card payment — called by api/stripe-webhook.js;
//   - dzActivated, after a CCP / BaridiMob request is approved — called by
//     api/_lib/admin/moderation.js.
// Both read the account AFTER the plan was written, so the tier and the end
// date in the email are the ones actually granted. Neither ever throws: an
// email that fails must not undo or fail the activation it reports.

const planVars = (meta) => ({
  forfait: currentPlanLabel(meta.plan_label) || "Premium",
  date: meta.premium_until ? longDate(meta.premium_until) : "nouvel ordre",
  profils: profilesPhrase(meta.plan_label),
});

const METHODS = { ccp: "CCP", baridimob: "BaridiMob" };

async function send(admin, userId, id, extraVars, stamp) {
  try {
    if (!mailConfigured()) return false;
    const { data } = await admin.auth.admin.getUserById(userId);
    const user = data?.user;
    if (!user?.email) return false;
    const meta = user.app_metadata || {};
    // Once per payment: Stripe redelivers a webhook it did not get a 2xx for.
    if (stamp && meta[stamp.key] === stamp.value) return false;
    const mail = await composeEmail(admin, id, user, { ...planVars(meta), ...extraVars }, SITE);
    if (!mail) return false; // switched off in the admin tab
    if (stamp) await admin.auth.admin.updateUserById(userId, { app_metadata: { ...meta, [stamp.key]: stamp.value } });
    await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
    return true;
  } catch (err) {
    console.error(`planEmails: ${id} to ${userId} failed:`, err.message);
    return false;
  }
}

// After a Stripe Checkout session granted a pass. `sessionId` dedupes retries.
export const sendPremiumWelcome = (admin, userId, sessionId) =>
  send(admin, userId, "premiumWelcome", {}, { key: "premium_welcome_session", value: sessionId });

// After a DZD request was approved. One approval = one email (the request can
// only be approved once), so no stamp is needed.
export const sendDzActivated = (admin, userId, method) =>
  send(admin, userId, "dzActivated", { methode: METHODS[method] || "CCP / BaridiMob" });
