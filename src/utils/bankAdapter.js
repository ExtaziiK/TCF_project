import { fixEncodingDeep } from "@/utils/fixEncoding";

export const SECTION_LABELS = {
  co: "Compréhension orale",
  ce: "Compréhension écrite",
  ee: "Expression écrite",
  eo: "Expression orale",
};

// File-name prefix used by the media naming convention:
// Comprehension_Orale_quiz_1_question_24.mp3
const SECTION_PREFIX = {
  co: "comprehension_orale",
  ce: "comprehension_ecrite",
  ee: "expression_ecrite",
  eo: "expression_orale",
};

// Same convention, properly cased to match the actual file names uploaded to
// Supabase Storage (bucket paths are case-sensitive).
const SECTION_FILE_PREFIX = {
  co: "Comprehension_Orale",
  ce: "Comprehension_Ecrite",
  ee: "Expression_Ecrite",
  eo: "Expression_Orale",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const STORAGE_BASE = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public` : null;

// Builds the Supabase Storage URL for a question's media, following the same
// naming convention as the local dev media folders (Audio/Image buckets).
function remoteMediaUrl(section, qNum, order, bucket, ext) {
  if (!STORAGE_BASE || qNum == null || order == null) return null;
  const stem = `${SECTION_FILE_PREFIX[section]}_quiz_${qNum}_question_${order}`;
  return `${STORAGE_BASE}/${bucket}/${stem}.${ext}`;
}

const IMAGE_EXT = /\.(webp|png|jpe?g|gif|svg)$/i;

const baseName = (url) => {
  if (!url) return null;
  const last = String(url).split("/").pop() || "";
  return last.replace(/\.[^.]+$/, "").toLowerCase();
};

// Extracts the quiz number from a file name like "Quiz_1_CO.json" or a
// title like "Compréhension orale — Quiz 1".
function quizNumber(fileName, title) {
  const fromFile = /quiz[_\s-]*(\d+)/i.exec(fileName);
  if (fromFile) return Number(fromFile[1]);
  const fromTitle = /quiz\s*(\d+)/i.exec(title || "");
  return fromTitle ? Number(fromTitle[1]) : null;
}

// When on, remote media is not resolved to a predictable public URL here.
// Instead the question carries a `sign` descriptor and Quiz.jsx exchanges the
// logical coordinates for short-lived signed URLs at open time (see
// mediaService + api/media). Bundled dev media still resolves directly, so
// local `vite dev` is unaffected. Off (default) → the original behaviour.
const SIGNED_MEDIA = import.meta.env.VITE_SIGNED_MEDIA === "true";

// Resolves a question's media to a usable URL when one is available without
// signing (a bundled file, or — flag off — the Storage convention URL / raw
// JSON url). Returns { url, needsSigning }: needsSigning is true only when
// signed media is enabled and the file lives remotely, i.e. the client must
// sign it rather than receive a public URL.
function resolveMedia(url, conventionKey, mediaMap, { imagesOnly, remote } = {}) {
  if (imagesOnly && url && !IMAGE_EXT.test(url)) url = null; // junk like noUser.html
  const key = baseName(url) || conventionKey;
  if (key && mediaMap[key]) return { url: mediaMap[key], needsSigning: false }; // bundled (dev) wins
  if (SIGNED_MEDIA) return { url: null, needsSigning: !!remote };
  const fromStorage = remote && remoteMediaUrl(remote.section, remote.qNum, remote.order, remote.bucket, remote.ext);
  return { url: fromStorage || url || null, needsSigning: false };
}

// Builds the optional `sign` descriptor from the per-kind resolution results:
// the coordinates Quiz.jsx needs to batch-sign, or null when nothing remote
// needs signing (flag off, or all media is bundled/local). Both sections' images
// are signed when remote; the server maps CO images to their Serie_<n>_Q<order>.jpg
// object and everything else to its HMAC name (see api/_lib/media.js#objectNameFor).
function signDescriptor(section, qNum, order, img, aud) {
  const image = img.needsSigning;
  const audio = aud.needsSigning;
  if (!image && !audio) return null;
  return { section, quiz: qNum, order, image, audio };
}

function fromDetailedAnswers(data, { section, fileName, audioMap, imageMap }) {
  const title = data.exam_title || fileName.replace(/\.json$/i, "");
  const qNum = quizNumber(fileName, title);
  const prefix = SECTION_PREFIX[section];
  const questions = data.detailed_answers
    .filter((a) => a.question_type === "mcq" && Array.isArray(a.all_options) && a.all_options.length >= 2)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((a) => {
      const options = [...a.all_options].sort((x, y) => (x.order || 0) - (y.order || 0));
      const conventionKey = qNum != null ? `${prefix}_quiz_${qNum}_question_${a.order}` : null;
      const aud = section === "co"
        ? resolveMedia(a.audio_url, conventionKey, audioMap, { remote: { section, qNum, order: a.order, bucket: "Audio", ext: "mp3" } })
        : { url: null, needsSigning: false };
      const img = resolveMedia(a.image_url, conventionKey, imageMap, { imagesOnly: true, remote: { section, qNum, order: a.order, bucket: "Image", ext: "webp" } });
      const sign = signDescriptor(section, qNum, a.order, img, aud);
      return {
        id: `bank-${section}-${data.exam_id ?? fileName}-${a.question_id}`,
        q: a.question_text,
        opts: options.map((o) => o.text),
        a: options.findIndex((o) => o.is_correct),
        exp: a.explanation || "",
        audio: aud.url,
        image: img.url,
        ...(a.points != null ? { points: a.points } : {}),
        ...(sign ? { sign } : {}),
      };
    })
    .filter((q) => q.a >= 0);
  if (!questions.length) return null;
  return { id: `${section}-${fileName}`, title, section, quizNumber: qNum, questions };
}

function fromPlainArray(data, { section, fileName, audioMap, imageMap }) {
  const title = fileName.replace(/\.json$/i, "").replace(/[_-]+/g, " ");
  const qNum = quizNumber(fileName, title);
  const prefix = SECTION_PREFIX[section];
  const questions = data
    .filter((item) => item && item.question && Array.isArray(item.alternatives || item.options))
    .map((item, idx) => {
      const alts = item.alternatives || item.options;
      const order = idx + 1;
      const conventionKey = qNum != null ? `${prefix}_quiz_${qNum}_question_${order}` : null;
      const aud = section === "co"
        ? resolveMedia(item.audio, conventionKey, audioMap, { remote: { section, qNum, order, bucket: "Audio", ext: "mp3" } })
        : { url: null, needsSigning: false };
      const img = resolveMedia(item.image, conventionKey, imageMap, { imagesOnly: true, remote: { section, qNum, order, bucket: "Image", ext: "webp" } });
      const sign = signDescriptor(section, qNum, order, img, aud);
      return {
        id: `bank-${section}-${fileName}-${idx}`,
        q: item.question,
        opts: alts,
        a: Number.isInteger(item.answer_index) ? item.answer_index : 0,
        exp: item.explanation || "",
        level: item.level,
        audio: aud.url,
        image: img.url,
        ...(sign ? { sign } : {}),
      };
    });
  if (!questions.length) return null;
  return { id: `${section}-${fileName}`, title, section, quizNumber: qNum, questions };
}

// Third supported shape: the "série" export ({ metadata, scoring, questions,
// stats }) where each question has options as { id: "A", text } and a
// letter-based `correct`. Option text is often empty for image/audio MCQs — the
// answer is spoken in the audio — so it falls back to the letter id.
//
// Audio is served from OUR Supabase Storage via the naming convention
// (Comprehension_Orale_quiz_<n>_question_<order>.mp3), NOT the file's own
// audio_url — so it goes through the same signed-media path as the rest of the
// bank in production. Images likewise come from our Supabase Image bucket
// (Serie_<n>_Q<order>.jpg), not the file's original public image_url.
function fromSeriesFormat(data, { section, fileName, audioMap, imageMap }) {
  const qNum = data.metadata?.serie_number ?? quizNumber(fileName, data.metadata?.page_title || "");
  const title = `${SECTION_LABELS[section]} – Quiz ${qNum ?? "?"}`;
  const prefix = SECTION_PREFIX[section];
  const questions = (data.questions || [])
    .filter((q) => q && Array.isArray(q.options) && q.options.length >= 2)
    .map((q, idx) => {
      const order = q.id ?? idx + 1;
      const opts = q.options.map((o) => (o.text && String(o.text).trim()) ? o.text : String(o.id ?? ""));
      const conventionKey = qNum != null ? `${prefix}_quiz_${qNum}_question_${order}` : null;
      const aud = section === "co"
        ? resolveMedia(q.audio_url, conventionKey, audioMap, { remote: { section, qNum, order, bucket: "Audio", ext: "mp3" } })
        : { url: null, needsSigning: false };
      // CO listening images live in our private Image bucket (Serie_<n>_Q<order>.jpg)
      // and are reached through the same signed-URL path as the audio. A bundled dev
      // image wins; with signing off (local dev) we fall back to the file's original
      // public URL so nothing regresses. Only questions that actually carry an image
      // are signed.
      const bundledImg = imageMap[baseName(q.image_url) || conventionKey];
      const img = bundledImg
        ? { url: bundledImg, needsSigning: false }
        : SIGNED_MEDIA
          ? { url: null, needsSigning: !!q.image_url }
          : { url: q.image_url || null, needsSigning: false };
      const sign = signDescriptor(section, qNum, order, img, aud);
      return {
        id: `bank-${section}-${fileName}-${order}`,
        q: q.question,
        opts,
        a: q.options.findIndex((o) => String(o.id) === String(q.correct)),
        exp: q.explanation || "",
        audio: aud.url,
        image: img.url,
        ...(q.points != null ? { points: q.points } : {}),
        ...(sign ? { sign } : {}),
      };
    })
    .filter((q) => q.a >= 0);
  if (!questions.length) return null;
  return { id: `${section}-${fileName}`, title, section, quizNumber: qNum, questions };
}

// Normalizes one bank JSON file (any supported format) into
// { id, title, section, quizNumber, questions: [{ q, opts, a, exp, audio, image }] }.
export function adaptBankFile(raw, ctx) {
  const data = fixEncodingDeep(raw);
  if (data && Array.isArray(data.detailed_answers)) return fromDetailedAnswers(data, ctx);
  if (data && Array.isArray(data.questions)) return fromSeriesFormat(data, ctx);
  if (Array.isArray(data)) return fromPlainArray(data, ctx);
  return null;
}
