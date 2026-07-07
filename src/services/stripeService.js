import { supabase } from "@/services/supabaseClient";

// Starts a Stripe Checkout session for the given price and redirects the
// browser to Stripe's hosted payment page. The session is created server-side
// (api/create-checkout-session) since it needs the Stripe secret key.
export async function startCheckout(priceId) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not-authenticated");

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ priceId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "checkout-failed");
  window.location.href = json.url;
}
