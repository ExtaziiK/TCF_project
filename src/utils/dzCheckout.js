// The DZD manual checkout is reached via nav("checkout-dz"), and nav() carries
// no params — so the plan the visitor picked on the Tarifs page is stashed here
// (sessionStorage, survives a reload/deep-link within the tab). The checkout
// page reads it on mount and bounces back to Tarifs if it's missing.
const KEY = "passerelle.dzCheckoutPlan";

export const setDzCheckoutPlan = (name) => {
  try { sessionStorage.setItem(KEY, name || ""); } catch { /* private mode */ }
};

export const getDzCheckoutPlan = () => {
  try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; }
};
