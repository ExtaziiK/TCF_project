import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBlogIndex } from "../scripts/blog-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// src/constants/blogIndex.js is generated (it keeps article bodies out of the
// first JavaScript file). A post added or edited without re-running the script
// would leave the site's titles, URLs and sitemap one article behind.
test("blogIndex.js is up to date — run `node scripts/blog-index.mjs`", async () => {
  const committed = readFileSync(path.join(root, "src/constants/blogIndex.js"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(committed, await buildBlogIndex());
});
