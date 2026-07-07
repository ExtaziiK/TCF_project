import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Stripe requires the raw request body to verify the webhook signature, so
// Vercel's automatic JSON body parsing must be disabled for this route.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// current_period_end has moved around across Stripe API versions (top-level
// on the subscription vs. per billing item); check both, and never let a
// missing/odd shape throw - a null premium_until just means "no expiry
// tracked", which rbac.js already treats as an active subscription.
function periodEndISO(subscription) {
  const raw = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
  if (!raw) return null;
  const date = new Date(raw * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Merges (rather than replaces) app_metadata so unrelated fields - like an
// admin's role - are never dropped by a subscription update.
async function setPremiumStatus(userId, patch) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) return;
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { ...data.user.app_metadata, ...patch },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const signature = req.headers["stripe-signature"];
  const rawBody = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await setPremiumStatus(userId, {
            plan: "Premium",
            premium_until: periodEndISO(subscription),
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          const active = ["active", "trialing"].includes(subscription.status);
          await setPremiumStatus(userId, {
            plan: active ? "Premium" : "Découverte",
            premium_until: active ? periodEndISO(subscription) : null,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;
        if (userId) await setPremiumStatus(userId, { plan: "Découverte", premium_until: null });
        break;
      }
      default:
        break;
    }
    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
