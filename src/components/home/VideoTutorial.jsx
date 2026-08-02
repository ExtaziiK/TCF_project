import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { useApp } from "@/context/AppContext";

const VIDEO_ID = "yDErYiLOgFw";
const ORIGIN = "https://www.youtube-nocookie.com";

// The tutorial video, which starts itself when the visitor scrolls to it.
//
// Nothing is requested from YouTube until then: the poster is a plain <img> and
// the iframe is only mounted on the first intersection. That keeps the landing
// page free of third-party frames (and their cookies) for anyone who never
// scrolls this far, which is most visitors.
//
// Autoplay is MUTED because every browser blocks it otherwise — an unmuted
// autoplay is simply refused, and the visitor gets a still frame with no
// explanation. Muted-and-playing is the strongest start available; the controls
// let them turn sound on.
//
// youtube-nocookie.com rather than youtube.com: same player, no tracking
// cookie until playback. It is also the only host allowed by frame-src in
// vercel.json, so switching domains here means changing the CSP too.
export function VideoTutorial() {
  const { c, t } = useApp();
  const boxRef = useRef(null);
  const frameRef = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    // Respect a visitor who has asked for less motion: still offer the video,
    // just never start it on its own.
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const io = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!calm) setStarted(true);
          return;
        }
        // Scrolled away: pause rather than leave it running out of sight.
        // postMessage talks to the player directly, so this needs no YouTube
        // script — which matters, since script-src is 'self'.
        frameRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          ORIGIN,
        );
      },
      // Half of it on screen: enough to mean "looking at it" rather than
      // "it clipped the bottom edge while scrolling past".
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const src =
    `${ORIGIN}/embed/${VIDEO_ID}` +
    "?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1";

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 md:pb-28">
      <div className="max-w-3xl mx-auto text-center mb-8">
        <p className="text-xs font-bold tracking-wider uppercase text-blue-600">{t("Visite guidée")}</p>
        <h2 className={`font-display font-bold text-2xl md:text-3xl mt-2 ${c.text}`}>
          {t("Découvrez Passerelle en vidéo")}
        </h2>
        <p className={`mt-3 text-sm md:text-base ${c.sub}`}>
          {t("Cinq minutes pour comprendre comment préparer chaque épreuve sur la plateforme.")}
        </p>
      </div>

      <div className="max-w-4xl mx-auto rounded-3xl p-[3px] grad-brand shadow-xl shadow-blue-600/20">
        <div
          ref={boxRef}
          className="relative aspect-video rounded-[21px] overflow-hidden bg-black"
        >
          {started ? (
            <iframe
              ref={frameRef}
              src={src}
              title={t("Découvrez Passerelle en vidéo")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            // Poster + a real button, so the video is reachable by click and by
            // keyboard even when autoplay never fires (reduced motion, or an
            // observer that has not triggered yet).
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="absolute inset-0 w-full h-full group"
              aria-label={t("Lire la vidéo de présentation")}
            >
              <img
                src={`https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-16 h-16 rounded-full grad-brand text-white flex items-center justify-center shadow-2xl shadow-blue-600/40 transition-transform group-hover:scale-110">
                  <Play size={26} className="ml-1" fill="currentColor" />
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
