# figma-export

Generated copies of all 26 pages, prepared for importing into Figma with the
**html.to.design** plugin. Do not edit these by hand — they are rebuilt by
`tools/build-figma-export.js`.

## Why this folder exists

html.to.design renders a page in a headless browser and never scrolls it. The
production pages rely on scroll and JavaScript for a lot of their final
appearance, so importing them directly produces frames with missing content.
Four specific problems, and what the build does about each:

| Problem in the live pages | Result in Figma | Fix applied |
| --- | --- | --- |
| 40 elements use `.rv` scroll-reveal, sitting at `opacity: 0` until `IntersectionObserver` fires | Everything below the fold imports invisible | CSS forces `.rv` to `opacity: 1; transform: none` |
| 118 `loading="lazy"` images never enter the viewport | Blank image boxes | Rewritten to `loading="eager"` |
| Photos hotlink to `images.pexels.com`, which throttles burst requests (11 of 12 failed locally) | Missing / intermittent images | All 22 photos vendored into `img/` and referenced locally |
| Counters render as literal `0` and are animated up by JS | Stats show `0` | Final values baked into the markup (`41`, `₹9,340 Cr`, `28`, `61 days`) |

It also freezes transitions, collapses animations onto their end state, pins
the fixed header to the top of the document, and hides viewport-anchored
chrome (`.fab`, `.readbar`, `.toasts`) that would otherwise float over the
middle of a full-page frame.

Note the animations are collapsed rather than disabled. A plain
`animation: none` would strand the reveals that *start* at `opacity: 0`
(`fadeIn`) or undrawn (`draw`) — they would import invisible. Setting a ~0s
duration and keeping the authored `forwards` fill-mode lands them on their
last keyframe instead.

## What is intentionally still transparent

Verified as deliberate design states, left alone:

- `.prop__cta` ("View residence") — a hover affordance, correctly hidden at rest
- `.cal__day` at `0.5` — past / unavailable calendar dates
- `.slot` at `0.4` — an unavailable time slot
- `.btn--primary` at `0.38` on `system.html` — the design system's Disabled button state

## Rebuilding

```bash
node tools/build-figma-export.js
```

Re-downloads the 22 photos and regenerates all 26 pages from the sources one
directory up. Safe to re-run; it wipes and recreates this folder — except this
README, so re-add it if you regenerate from scratch.

## Importing

`URLS.txt` holds all 26 page URLs in reading order, ready to paste into
html.to.design's bulk URL import. Import at a 1440px viewport width.
