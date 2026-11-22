const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

assert.match(css, /body\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*280px 1fr/s);
assert.match(css, /\.sidebar\s*\{[^}]*height:\s*100dvh[^}]*position:\s*sticky[^}]*top:\s*0[^}]*align-self:\s*start[^}]*overflow-y:\s*auto/s,
  "Desktop navigation stays pinned to the viewport and scrolls internally on short screens");
assert.match(css, /@media \(max-width:\s*860px\)[\s\S]*?\.sidebar\s*\{[^}]*height:\s*auto[^}]*position:\s*sticky[^}]*overflow-y:\s*visible/s,
  "Mobile navigation keeps its compact natural height");

console.log("Fixed sidebar: desktop viewport pinning, short-screen overflow and compact mobile override OK.");
