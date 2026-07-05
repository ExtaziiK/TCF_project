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

// Resolves a question's media: a local file (matched by URL basename or by
// naming convention) wins over the remote URL from the JSON.
function resolveMedia(url, conventionKey, mediaMap, { imagesOnly } = {}) {
  if (imagesOnly && url && !IMAGE_EXT.test(url)) url = null; // junk like noUser.html
  const key = baseName(url) || conventionKey;
  if (key && mediaMap[key]) return mediaMap[key];
  return url || null;
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
      return {
        id: `bank-${section}-${data.exam_id ?? fileName}-${a.question_id}`,
        q: a.question_text,
        opts: options.map((o) => o.text),
        a: options.findIndex((o) => o.is_correct),
        exp: a.explanation || "",
        audio: resolveMedia(a.audio_url, conventionKey, audioMap),
        image: resolveMedia(a.image_url, conventionKey, imageMap, { imagesOnly: true }),
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
      const conventionKey = qNum != null ? `${prefix}_quiz_${qNum}_question_${idx + 1}` : null;
      return {
        id: `bank-${section}-${fileName}-${idx}`,
        q: item.question,
        opts: alts,
        a: Number.isInteger(item.answer_index) ? item.answer_index : 0,
        exp: item.explanation || "",
        level: item.level,
        audio: resolveMedia(item.audio, conventionKey, audioMap),
        image: resolveMedia(item.image, conventionKey, imageMap, { imagesOnly: true }),
      };
    });
  if (!questions.length) return null;
  return { id: `${section}-${fileName}`, title, section, quizNumber: qNum, questions };
}

// Normalizes one bank JSON file (either supported format) into
// { id, title, section, quizNumber, questions: [{ q, opts, a, exp, audio, image }] }.
export function adaptBankFile(raw, ctx) {
  const data = fixEncodingDeep(raw);
  if (data && Array.isArray(data.detailed_answers)) return fromDetailedAnswers(data, ctx);
  if (Array.isArray(data)) return fromPlainArray(data, ctx);
  return null;
}
