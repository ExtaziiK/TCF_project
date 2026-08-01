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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
