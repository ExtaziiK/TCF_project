import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import "@/styles/index.css";

// Never reopen a page where the visitor left it. Browsers restore the previous
// scroll offset on reload and on back/forward, which on a long page drops you
// straight into the footer — and on a client-rendered app it happens before the
// content exists, so the offset lands somewhere arbitrary.
//
// Set here rather than in an inline <script> in index.html: the CSP is
// `script-src 'self'`, so an inline one would be blocked. This module runs
// before the app renders, which is early enough to pre-empt the restore.
if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

// Pages and quiz banks are separate chunks fetched on demand. A tab left open
// across a deploy still asks for the old hashed files, which no longer exist:
// reload once to pick up the new build instead of rendering a blank page. The
// timestamp guard stops a loop if the chunk is missing for another reason.
const RELOAD_KEY = "chunk-reload-at";
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
    if (Date.now() - last < 10_000 || !navigator.onLine) return; // let the caller show its error
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return; // storage blocked: no loop guard, so no automatic reload
  }
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
