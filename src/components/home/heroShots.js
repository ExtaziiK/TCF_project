// The app screenshots used on the landing page's collage and on the visitors'
// pitch pages: dark captures in src/assets/hero, light ones in
// src/assets/hero/light under the same names (a screen without a light
// capture falls back to its dark one).
const DARK = import.meta.glob("/src/assets/hero/*.webp", { eager: true, query: "?url", import: "default" });
const LIGHT = import.meta.glob("/src/assets/hero/light/*.webp", { eager: true, query: "?url", import: "default" });

export const darkShot = (name) => DARK[`/src/assets/hero/${name}.webp`];
export const lightShot = (name) => LIGHT[`/src/assets/hero/light/${name}.webp`] || darkShot(name);
export const heroShot = (name, dark) => (dark ? darkShot(name) : lightShot(name));
