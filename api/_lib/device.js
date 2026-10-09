// "Which phone, which browser" from a User-Agent, in words an admin reads at a
// glance next to a failed analysis. Pure, so tests/failure-context.test.mjs
// pins it without a request.
//
// The in-app browsers come first and matter most: most candidates arrive from
// a Facebook group, and Facebook's / Instagram's built-in browser is where
// microphone access and long uploads fail most often. "Chrome" alone would
// hide that — their UA also says Chrome (Android) or Safari (iOS).

export function describeDevice(ua = "") {
  const s = String(ua);
  const device =
    /iPad/.test(s) ? "iPad"
      : /iPhone|iPod/.test(s) ? "iPhone"
        : /Android/.test(s) ? "Android"
          : /Windows/.test(s) ? "Windows"
            : /Macintosh|Mac OS X/.test(s) ? "Mac"
              : /CrOS/.test(s) ? "Chromebook"
                : /Linux/.test(s) ? "Linux"
                  : "inconnu";

  const version = (re) => s.match(re)?.[1]?.split(".")[0];
  let browser;
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(s)) browser = "Facebook (navigateur intégré)";
  else if (/Instagram/.test(s)) browser = "Instagram (navigateur intégré)";
  else if (/Messenger|MESSENGER/.test(s)) browser = "Messenger (navigateur intégré)";
  else if (/SamsungBrowser\/([\d.]+)/.test(s)) browser = `Samsung Internet ${version(/SamsungBrowser\/([\d.]+)/)}`;
  else if (/Edg(?:A|iOS)?\/([\d.]+)/.test(s)) browser = `Edge ${version(/Edg(?:A|iOS)?\/([\d.]+)/)}`;
  else if (/OPR\/([\d.]+)/.test(s)) browser = `Opera ${version(/OPR\/([\d.]+)/)}`;
  else if (/Firefox\/([\d.]+)|FxiOS\/([\d.]+)/.test(s)) browser = `Firefox ${version(/(?:Firefox|FxiOS)\/([\d.]+)/)}`;
  else if (/CriOS\/([\d.]+)/.test(s)) browser = `Chrome ${version(/CriOS\/([\d.]+)/)}`;
  else if (/Chrome\/([\d.]+)/.test(s)) browser = `Chrome ${version(/Chrome\/([\d.]+)/)}`;
  else if (/Safari\//.test(s) && /Version\/([\d.]+)/.test(s)) browser = `Safari ${version(/Version\/([\d.]+)/)}`;
  else browser = s ? "autre" : "inconnu";

  return { device, browser };
}
