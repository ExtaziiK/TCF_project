import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Opens the Stripe billing portal so a subscriber can update their card,
// view invoices, or cancel. The customer id was stored on the user's
// app_metadata by the Stripe webhook at checkout.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return res.status(401).json({ error: "Invalid session" });

  const customerId = userData.user.app_metadata?.stripe_customer_id;
  if (!customerId) return res.status(400).json({ error: "no-subscription" });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
