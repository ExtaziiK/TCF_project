import { sendMail, mailConfigured } from "./mailer.js";
import { composeEmail } from "./emails.js";
import { profilesPhrase, longDate } from "./emailTemplates.js";
import { currentPlanLabel } from "./planLabel.js";
import { SITE } from "./welcome.js";
import { firstNameOf } from "./emailLayout.js";

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

// Trustpilot's Automatic Feedback Service: a hidden copy of each "plan active"
// email to this address makes Trustpilot invite the buyer to review us (after
// the delay set in Trustpilot Business), as a verified purchase. Only these
// two emails carry it, so only paying customers are ever invited — never a
// free account. TRUSTPILOT_BCC (Vercel env, then redeploy) overrides the
// address; "off" stops the invitations without touching the code.
const TRUSTPILOT_BCC_DEFAULT = "tcfpasserelle.com+21b63e2752@invite.trustpilot.com";
const trustpilotBcc = () => {
  const v = (process.env.TRUSTPILOT_BCC ?? TRUSTPILOT_BCC_DEFAULT).trim();
  return v && v.toLowerCase() !== "off" ? v : null;
};

// Trustpilot's structured-data snippet: tells its parser exactly who to invite
// and which order the review belongs to, instead of guessing from the headers.
// Mail clients do not run or show <script>, so the buyer never sees it. "<" is
// escaped so a display name can never close the tag early.
const trustpilotSnippet = ({ email, name, referenceId }) => {
  const json = JSON.stringify({ recipientEmail: email, recipientName: name || undefined, referenceId })
    .replace(/</g, "\\u003c");
  return `<script type="application/json+trustpilot">${json}</script>`;
};

async function send(admin, userId, id, extraVars, stamp, referenceId) {
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
    const bcc = trustpilotBcc();
    const html = bcc
      ? mail.html + trustpilotSnippet({ email: user.email, name: firstNameOf(user), referenceId: referenceId || userId })
      : mail.html;
    await sendMail({ to: user.email, ...(bcc ? { bcc } : {}), subject: mail.subject, html });
    return true;
  } catch (err) {
    console.error(`planEmails: ${id} to ${userId} failed:`, err.message);
    return false;
  }
}

// After a Stripe Checkout session granted a pass. `sessionId` dedupes retries.
export const sendPremiumWelcome = (admin, userId, sessionId) =>
  send(admin, userId, "premiumWelcome", {}, { key: "premium_welcome_session", value: sessionId }, sessionId);

// After a DZD request was approved. One approval = one email (the request can
// only be approved once), so no stamp is needed.
export const sendDzActivated = (admin, userId, method, requestId) =>
  send(admin, userId, "dzActivated", { methode: METHODS[method] || "CCP / BaridiMob" }, null, requestId ? `dz-${requestId}` : null);
