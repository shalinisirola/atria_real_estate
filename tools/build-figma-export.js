/* Build Figma-import-ready copies of every page.
   Fixes the four things that break html.to.design captures:
     1. scroll-reveal elements stuck at opacity:0
     2. lazy images that never load headlessly
     3. fixed/sticky chrome floating over the wrong section
     4. JS-animated counters that render as literal "0"
*/
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..");
const OUT = path.join(SRC, "figma-export");

const OVERRIDES = `
  <style id="figma-export-overrides">
    /* ===== Figma export overrides — generated, do not hand-edit ===== */
    html { scroll-behavior: auto !important; }
    *, *::before, *::after { transition: none !important; }

    /* Collapse animations to their finished state rather than killing them.
       "animation: none" would strand the reveals that START at opacity:0
       (fadeIn) or undrawn (draw) — they'd import invisible. A ~0s duration
       plus the authored "forwards" fill-mode lands those on their last
       keyframe instantly. Looping animations (marq, shimmer, spin) declare
       no fill-mode, so one instant iteration returns them to their base
       state, which is what we want in a static frame. */
    *, *::before, *::after {
      animation-duration: 0.001s !important;
      animation-delay: 0s !important;
      animation-iteration-count: 1 !important;
    }

    /* Exception: the ambient 26s hero zoom ends at scale(1.09), which would
       be captured as a cropped image. Hold its natural framing instead. */
    .hero__photo img { animation: none !important; }

    /* Belt-and-braces for the two animation-driven reveals: rather than trust
       the renderer to settle a 0s animation, pin their end state outright.
       (Verified necessary — .hero__draw text still computed to opacity 0.) */
    .hero__draw text { opacity: 1 !important; }
    /* Selector list mirrors the source rule exactly — it dash-offsets
       path/line/rect/circle, and missing any of them leaves that shape
       undrawn (stroke-dashoffset: 2400) in the capture. */
    .hero__draw path, .hero__draw line, .hero__draw rect, .hero__draw circle {
      stroke-dashoffset: 0 !important;
    }
    /* Reveal-on-scroll elements never fire IntersectionObserver in a headless
       render, so force them to their settled state. */
    .rv, .rv-d1, .rv-d2, .rv-d3 {
      opacity: 1 !important;
      transform: none !important;
      transition-delay: 0s !important;
    }
    /* Pin the header to the top of the document instead of the viewport,
       otherwise it floats over the middle of a full-page capture. */
    .nav, .nav--over {
      position: absolute !important;
      top: 0 !important;
    }
    /* Viewport-anchored chrome that would overlap the design in a static frame. */
    .fab, .readbar, .toasts, .skip {
      display: none !important;
    }
  </style>
`;

// Indian digit grouping: last 3, then pairs. 9340 -> 9,340
function enIN(n) {
  const s = String(n);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return rest + "," + last3;
}

// Clear generated artefacts only — README.md is hand-written and stays.
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith(".html")) fs.rmSync(path.join(OUT, f));
}
fs.rmSync(path.join(OUT, "img"), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "img"), { recursive: true });

const pages = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith(".html"))
  .sort();

// ---- vendor the remote photos ------------------------------------------
// The hero renders full-bleed so it needs the 2000px variant; everything else
// tops out around a 600px column, so 1200px is already oversampled.
const HERO_ID = "36944268";
const ids = new Set();
for (const f of pages) {
  const s = fs.readFileSync(path.join(SRC, f), "utf8");
  for (const m of s.matchAll(/images\.pexels\.com\/photos\/(\d+)\//g)) ids.add(m[1]);
}

const { execFileSync } = require("child_process");
let fetched = 0;
for (const id of ids) {
  const dims = id === HERO_ID ? "w=2000&h=1300" : "w=1200&h=900";
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&${dims}&fit=crop`;
  const dest = path.join(OUT, "img", `${id}.jpg`);
  execFileSync("curl", ["-sS", "--fail", "--retry", "3", "-o", dest, url]);
  const kb = Math.round(fs.statSync(dest).size / 1024);
  if (kb < 5) throw new Error(`${id}.jpg is only ${kb}KB — download looks truncated`);
  fetched++;
}
console.log(`vendored ${fetched} images into figma-export/img/\n`);

const report = [];

for (const file of pages) {
  let html = fs.readFileSync(path.join(SRC, file), "utf8");
  const before = html;

  // 1. eager images
  const lazyCount = (html.match(/loading="lazy"/g) || []).length;
  html = html.replace(/loading="lazy"/g, 'loading="eager"');

  // 1b. Point every image at a vendored local copy. Remote Pexels URLs get
  // throttled under the burst of parallel requests a full-page capture makes,
  // which lands in Figma as empty image boxes. srcset/sizes go too — the
  // capture renderer may resolve them to a different variant than intended.
  let imgCount = 0;
  html = html.replace(/\s+(?:srcset|sizes)="[^"]*"/g, "");
  html = html.replace(
    /https:\/\/images\.pexels\.com\/photos\/(\d+)\/[^"'\s]*/g,
    (m, id) => {
      imgCount++;
      return `img/${id}.jpg`;
    }
  );

  // 2. bake counter end-values into the markup
  let counterCount = 0;
  html = html.replace(
    /(data-count="(\d+)"([^>]*)>)0(?=<)/g,
    (m, open, num, attrs) => {
      counterCount++;
      const prefix = (attrs.match(/data-prefix="([^"]*)"/) || [, ""])[1];
      return open + prefix + enIN(num);
    }
  );

  // 3. inject overrides last in <head> so they win the cascade
  if (!html.includes("</head>")) {
    throw new Error(`${file}: no </head> to inject into`);
  }
  html = html.replace("</head>", OVERRIDES + "</head>");

  const rvCount = (before.match(/class="[^"]*\brv\b/g) || []).length;
  fs.writeFileSync(path.join(OUT, file), html);
  report.push({ file, rv: rvCount, lazy: lazyCount, counters: counterCount, imgs: imgCount });
}

console.log("page                      reveals  lazy-imgs  counters  imgs-localised");
console.log("-".repeat(70));
for (const r of report) {
  console.log(
    r.file.padEnd(24) +
      String(r.rv).padStart(7) +
      String(r.lazy).padStart(11) +
      String(r.counters).padStart(10) +
      String(r.imgs).padStart(16)
  );
}
// Emit the bulk-import list in reading order rather than alphabetical, so the
// frames land in Figma in an order that makes sense to review.
const ORDER = `index about listings property search agents agent journal article contact
booking checkout invoice payment-success payment-failed login signup forgot reset otp
verify welcome success dashboard admin system`.split(/\s+/).filter(Boolean);

const built = report.map((r) => r.file.replace(/\.html$/, ""));
const unordered = built.filter((n) => !ORDER.includes(n));
if (unordered.length) {
  throw new Error(`page(s) missing from ORDER, add them: ${unordered.join(", ")}`);
}
const BASE = "https://atria-residences-silk.vercel.app/figma-export";
const urls = ORDER.filter((n) => built.includes(n)).map((n) => `${BASE}/${n}.html`);
fs.writeFileSync(path.join(OUT, "URLS.txt"), urls.join("\n") + "\n");

console.log("-".repeat(70));
console.log(`${report.length} pages written to figma-export/`);
console.log(`${urls.length} URLs written to figma-export/URLS.txt`);



// npx --yes serve -l 4173 .