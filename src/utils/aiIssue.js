import { describeDevice } from "../../api/_lib/device.js";

// What the candidate is told when an analysis or a recording goes wrong:
// the problem in one line, then what to do about it, in steps.
//
// Four of the admin's incident kinds have a cause the candidate can act on, so
// they are named — a muted or busy microphone, a refused permission, a dropped
// connection, an analysis cut off by its time limit. Everything else (Groq
// refusals, a bug of ours: "Erreur interne" in the admin) is never named: the
// candidate only gets "refresh the page" — see RefreshNotice.
//
// `cause`: one line saying WHERE the problem is — the candidate's device,
// its settings, their browser or their connection — so nobody reads the card
// as "the site is broken". Set only where that is true: a timeout ("timeout")
// usually happens on our side (the analysis ran too long on the server), so it
// has no cause line and stays neutral.
//
// Pure (no React, no DOM), pinned by tests/ai-issue.test.mjs.

// Facebook / Instagram / Messenger's built-in browser: where the microphone
// fails most often, and most candidates arrive from a Facebook group.
export function isInAppBrowser(ua = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return /navigateur intégré/.test(describeDevice(ua).browser);
}

const OPEN_IN_BROWSER = "Vous êtes dans le navigateur de Facebook ou d'Instagram : ouvrez cette page dans Chrome ou Safari (menu ⋯ puis « Ouvrir dans le navigateur »). Le micro y fonctionne bien mieux.";

// How a failed AI request is presented: "offline" (the connection dropped),
// "timeout" (a gateway answered instead of our function — it was cut off), or
// "generic" (anything else, never explained). `err` is an AiError.
export function failureKind(err, online = typeof navigator !== "undefined" ? navigator.onLine : true) {
  if (online === false) return "offline";
  if (err && err.serverReplied === false) {
    if (!err.status) return "offline";
    if (err.status === 502 || err.status === 503 || err.status === 504) return "timeout";
  }
  return "generic";
}

// The text for each failure kind. `section` "eo" adds the recording-specific
// advice (a slow connection lengthens the upload).
export function failureIssue(kind, section = "ee") {
  if (kind === "offline") {
    return {
      title: "Votre connexion internet a été interrompue.",
      cause: "Le problème vient de votre connexion (Wi-Fi ou données mobiles), pas du site.",
      steps: [
        "Vérifiez votre Wi-Fi ou vos données mobiles.",
        "Si la connexion est faible, rapprochez-vous de la box ou passez en données mobiles.",
        "Une fois reconnecté·e, actualisez la page et relancez.",
      ],
    };
  }
  if (kind === "timeout") {
    return {
      title: "L'analyse a pris trop de temps et a été interrompue.",
      steps: [
        "Actualisez la page et relancez : cela fonctionne en général dès le deuxième essai.",
        ...(section === "eo" ? ["Une connexion lente rallonge l'envoi de l'enregistrement : préférez le Wi-Fi si vous le pouvez."] : []),
        "Si cela se reproduit, réessayez dans quelques minutes.",
      ],
    };
  }
  return null; // generic: RefreshNotice's own wording, nothing explained
}

// The microphone problems. `code` is the browser's error name
// (getUserMedia: NotAllowedError, NotFoundError, NotReadableError…), or one
// of ours: "unsupported" (no recording API at all), "silent" (the recording
// came back empty).
export function micIssue(code, { inApp = false } = {}) {
  const lead = inApp ? [OPEN_IN_BROWSER] : [];
  if (code === "NotAllowedError" || code === "SecurityError" || code === "PermissionDeniedError") {
    return {
      title: "L'accès au micro a été refusé.",
      cause: inApp
        ? "Le problème vient du navigateur de Facebook ou d'Instagram, qui bloque souvent le micro — pas du site."
        : "Le problème vient des réglages de votre navigateur ou de votre téléphone : le micro n'y est pas autorisé pour ce site.",
      steps: [
        ...lead,
        "Touchez l'icône à gauche de l'adresse du site (cadenas ou ⓘ), puis autorisez le micro.",
        "Sur téléphone, vérifiez aussi les réglages de l'appareil : Réglages › votre navigateur › Micro activé.",
        "Puis actualisez la page.",
      ],
    };
  }
  if (code === "NotFoundError" || code === "OverconstrainedError" || code === "DevicesNotFoundError") {
    return {
      title: "Aucun micro n'a été trouvé.",
      cause: "Le problème vient de votre appareil : aucun micro n'y est branché ou activé.",
      steps: [
        ...lead,
        "Branchez un micro ou des écouteurs avec micro, ou reconnectez vos écouteurs Bluetooth.",
        "Sur ordinateur, vérifiez que le micro est activé dans les paramètres du son.",
        "Puis actualisez la page.",
      ],
    };
  }
  if (code === "NotReadableError" || code === "TrackStartError" || code === "AbortError") {
    return {
      title: "Votre micro est déjà utilisé par une autre application.",
      cause: "Le problème vient de votre appareil : une autre application garde le micro pour elle.",
      steps: [
        ...lead,
        "Terminez les appels en cours (WhatsApp, Messenger, Zoom…) et fermez les autres onglets qui utilisent le micro.",
        "Puis actualisez la page.",
      ],
    };
  }
  if (code === "unsupported") {
    return {
      title: "Ce navigateur ne permet pas d'enregistrer votre voix.",
      cause: inApp
        ? "Le problème vient du navigateur de Facebook ou d'Instagram, qui ne permet pas l'enregistrement — pas du site."
        : "Le problème vient de votre navigateur, trop ancien ou incompatible avec l'enregistrement audio.",
      steps: inApp
        ? [OPEN_IN_BROWSER]
        : ["Ouvrez cette page dans Chrome (Android, ordinateur) ou Safari (iPhone), à jour."],
    };
  }
  if (code === "silent") {
    return {
      title: "Votre micro n'a rien enregistré.",
      cause: inApp
        ? "Le problème vient de votre appareil ou du navigateur de Facebook, qui bloque souvent le micro — pas du site."
        : "Le problème vient du micro de votre appareil ou de ses réglages, pas du site.",
      steps: [
        ...lead,
        "Vérifiez que le micro n'est pas coupé (bouton muet, écouteurs Bluetooth déconnectés).",
        "Fermez les applications qui pourraient l'utiliser (appel en cours, WhatsApp…).",
        "Parlez près de l'appareil, puis recommencez.",
      ],
    };
  }
  // Any other error name: the generic microphone advice.
  return {
    title: "Le micro n'a pas pu démarrer.",
    cause: "Le problème vient de votre appareil ou de ses réglages, pas du site.",
    steps: [
      ...lead,
      "Autorisez le micro pour ce site, et fermez les applications qui pourraient l'utiliser.",
      "Puis actualisez la page.",
    ],
  };
}
