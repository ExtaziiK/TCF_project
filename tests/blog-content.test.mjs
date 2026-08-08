// Guards the blog articles (src/constants/posts/*.js).
//
// The posts used to be five-paragraph stubs stored inline in one constants
// file. They are now long-form, interlinked pages that carry most of the site's
// organic-search surface, and the failure modes are quiet ones: an article
// quietly trimmed below the length that made it worth publishing, a slug that
// stops matching its filename (so the file you edit is not the page you see),
// two posts sharing an id, a hero image with no dimensions (which makes the
// page jump while it loads).
//
// Link and image-file resolution is checked by `npm run check:seo`, which is
// where the route table lives.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src/constants/posts");
const files = readdirSync(dir).filter((f) => f.endsWith(".js"));

const posts = [];
for (const file of files) {
  const { post } = await import(pathToFileURL(path.join(dir, file)).href);
  posts.push({ file, post });
}

// Same walk as wordCount() in src/constants/blog.js — kept independent on
// purpose, so a bug in the counter can't silently pass its own test.
function words(post) {
  const text = post.body
    .map((b) => {
      if (typeof b === "string") return b;
      if (b.ul || b.ol) return (b.ul || b.ol).join(" ");
      if (b.table) return [...b.table.cols, ...b.table.rows.flat()].join(" ");
      if (b.img) return b.img.caption || "";
      if (b.cta) return b.cta.text;
      return [b.h, b.note, b.title, b.caption].filter(Boolean).join(" ");
    })
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*/g, "");
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}

test("there are articles to check", () => {
  assert.ok(posts.length >= 14, `expected at least 14 articles, found ${posts.length}`);
});

test("every article is at least 1 000 words", () => {
  for (const { file, post } of posts) {
    const n = words(post);
    assert.ok(n >= 1000, `${file}: ${n} words`);
  }
});

test("every article carries the fields the index and the head need", () => {
  for (const { file, post } of posts) {
    for (const field of ["id", "slug", "iso", "date", "cat", "t", "excerpt"]) {
      assert.ok(post[field], `${file}: missing "${field}"`);
    }
    assert.match(post.iso, /^\d{4}-\d{2}-\d{2}$/, `${file}: iso should be YYYY-MM-DD`);
    // The excerpt is the page's meta description; Google truncates past ~160.
    assert.ok(post.excerpt.length <= 200, `${file}: excerpt is ${post.excerpt.length} chars`);
  }
});

test("the slug matches the filename", () => {
  for (const { file, post } of posts) {
    assert.equal(`${post.slug}.js`, file, `${file}: slug is "${post.slug}"`);
  }
});

test("ids and slugs are unique", () => {
  const ids = posts.map((p) => p.post.id);
  const slugs = posts.map((p) => p.post.slug);
  assert.equal(new Set(ids).size, ids.length, "duplicate id");
  assert.equal(new Set(slugs).size, slugs.length, "duplicate slug");
});

test("every image declares a source, alt text and its real dimensions", () => {
  const check = (img, where) => {
    assert.ok(img.src?.startsWith("/blogue/"), `${where}: src should live under /blogue/`);
    assert.ok(img.alt?.length > 5, `${where}: alt text is missing or too short`);
    assert.ok(img.w > 0 && img.h > 0, `${where}: width/height missing (the page will jump while loading)`);
  };
  for (const { file, post } of posts) {
    assert.ok(post.hero, `${file}: no hero image`);
    check(post.hero, `${file} hero`);
    post.body.filter((b) => b?.img).forEach((b, i) => check(b.img, `${file} figure ${i + 1}`));
  }
});

test("articles link to other pages of the site", () => {
  for (const { file, post } of posts) {
    const text = JSON.stringify(post.body);
    const internal = [...text.matchAll(/\]\((\/[^)\s"]+)\)/g)].map(([, href]) => href);
    assert.ok(internal.length >= 4, `${file}: only ${internal.length} internal links`);
    // An article that only links to itself is not interlinked with anything.
    assert.ok(new Set(internal).size >= 4, `${file}: internal links are not varied enough`);
  }
});

test("no unbalanced inline markup", () => {
  for (const { file, post } of posts) {
    const text = JSON.stringify(post.body);
    // A "](": that isn't part of [label](target) means a malformed link, which
    // renders as literal brackets in the article.
    const links = (text.match(/\[[^\]]+\]\([^)\s]+\)/g) || []).length;
    const opens = (text.match(/\]\(/g) || []).length;
    assert.equal(links, opens, `${file}: malformed [label](target) markup`);
    const bold = (text.match(/\*\*/g) || []).length;
    assert.equal(bold % 2, 0, `${file}: unbalanced ** markers`);
  }
});
