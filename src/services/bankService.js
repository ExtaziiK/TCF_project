import { adaptBankFile } from "@/utils/bankAdapter";

// Auto-discovers everything under src/bank/ at build time. Adding a JSON to
// a section folder, or media files to media/audio | media/images, is enough:
// the dev server hot-reloads them and production builds bundle them.
const quizFiles = import.meta.glob("/src/bank/{co,ce,ee,eo}/*.json", { eager: true, import: "default" });
const audioFiles = import.meta.glob("/src/bank/media/audio/*.{mp3,wav,ogg,m4a,aac}", { eager: true, query: "?url", import: "default" });
const imageFiles = import.meta.glob("/src/bank/media/images/*.{webp,png,jpg,jpeg,gif,svg}", { eager: true, query: "?url", import: "default" });

// media maps: lowercase basename without extension -> bundled URL
function toMediaMap(files) {
  const map = {};
  for (const [path, url] of Object.entries(files)) {
    const name = path.split("/").pop().replace(/\.[^.]+$/, "").toLowerCase();
    map[name] = url;
  }
  return map;
}

const audioMap = toMediaMap(audioFiles);
const imageMap = toMediaMap(imageFiles);

function buildBank() {
  const bank = { co: [], ce: [], ee: [], eo: [] };
  for (const [path, raw] of Object.entries(quizFiles)) {
    const parts = path.split("/");
    const fileName = parts.pop();
    const section = parts.pop();
    const quiz = adaptBankFile(raw, { section, fileName, audioMap, imageMap });
    if (quiz) bank[section].push(quiz);
  }
  for (const list of Object.values(bank)) {
    list.sort((a, b) => (a.quizNumber ?? 1e9) - (b.quizNumber ?? 1e9) || a.title.localeCompare(b.title));
  }
  return bank;
}

const BANK = buildBank();

export function getBank() {
  return BANK;
}

export function getBankStats() {
  return {
    localAudioCount: Object.keys(audioMap).length,
    localImageCount: Object.keys(imageMap).length,
  };
}
