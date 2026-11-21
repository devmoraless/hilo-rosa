# Build variant v2 of the landing

Write ONE static file, `index.html` in this folder (`v2/index.html`): HTML, inline CSS and at most inline JS, no build step, no framework.
Content: the same in every variant, taken only from `../brief.md` (a MISSING beat is left out, never invented).
Only the design changes. Your design is this genome (`genome.json`); follow every gene:

- type: **condensed**
- scale: **bold**
- color: **dark media**
- layout: **editorial column**
- components: **soft**
- imagery: **3D cut-out**
- motion: **still**
- voice: **numbers first**
- stage: **three.js scroll-driven**
- ground: **dark** (the page's main background is dark; the color gene says which colors, this says how light)
- fonts: **Bebas Neue** (display, weights 400) + **Fira Sans** (body, weights 400;600); load exactly this, no other face:
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fira+Sans:wght@400;600&display=swap">` (design-lint warns when the page loads another pair; Inter, Roboto, Arial and Geist are never a display face)
- creativity: **3/5** (same family, a new identity: keep what the human liked, change the hero's composition)
- composition: **monument** (the hero's geometry, measured by the capture: one object centered as a monument; the copy sits under it)
- motif: **specimen sheet** (a catalog or specimen layout: one thing, labeled). ONE motif carried strongly, few objects: identity, not quantity. Write it as the first line of `index.html`: `<!-- motif: <the idea in one sentence> -->`
- recipe: **landing-story** (use that skill's method for the look)

## Bounds (same as landing-story; they override any size in MotionSites examples or craft.md)
- Hero display type: at most 96 px at 1280 wide and at most 48 px at 390 wide. Your scale gene picks inside that: hero display at most 96 px at 1280.
- Body text 16-18 px. Primary buttons 40-52 px tall. At most 6 palette colors besides media. Colors are tokens in `:root`.
- It must read at 1280x720 (the hero above the fold) and at 390 px wide with no horizontal scroll.

## The desktop first, the stage hero (the human's rules from R3; they override anything above)
- Design for 1440 and 1920 wide first, then 390. The hero is full-bleed. Content containers are at least 1200 px at 1440
  (a text column may be narrower, the composition fills the screen). No section with wide empty gutters.
- The hero is a stand-by loop for a projector: it runs with NO interaction in a 10-15 s cycle and tells the project to a
  stranger: subject, what the product finds, the result, the wow. Your `stage` gene (**three.js scroll-driven**) says how. Reduced motion gives a complete still.
- Raster images keep their aspect ratio: `object-fit: cover` (crop) or `contain` (fit), never `fill` or a width and height that disagree with the file
  (the capture flags `distorted image`). Never show a raster upscaled. Recreate the subject (3D, points, line art, vector) or show it at or below native size. A real
  result chart may be rebuilt as live SVG/HTML from its real numbers.
- three.js: import map pinned to `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js` (addons under `.../three@0.170.0/examples/jsm/`),
  devicePixelRatio at most 2, pause rendering when the tab is hidden, a designed still when WebGL is missing, no branded 3D models
  (build from primitives or the team's own assets), no network fetches but that CDN and fonts.
- Glows, neon blurs and soft gradient haze are tells (the human: "AI slop"); light comes from the scene itself.
- The hero breathes (at 1920x1080 and 1280x720; the capture counts the words at the fold and flags `dense`): one headline, one sentence,
  one or two actions, at most 3 secondary elements (a stat, a legend, a badge) besides the stage, about 45 words in all. The stage
  carries the story; the text does not repeat it, and no text block sits over the stage's focal point. Later sections: one idea each,
  at most ~4 cards or ~80 words. The human on a saturated landing: "too much information, things pop up everywhere".
- Check the page at 1920x1080 (the projector): `1920.png` if the capture wrote one, else open index.html at that size; then 1280 and 390.

## Animation budget (three.js stage: the capture measures it and flags `heavy`)
- `new THREE.WebGLRenderer({antialias: false, powerPreference: 'low-power'})`; `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`
  (tighter than the cap of 2 above: this is the budget).
- At most ~40k points or ~10k instances: one `BufferGeometry` of points or one `InstancedMesh`, never a mesh per object.
- Render only while visible: stop the loop on `visibilitychange` and when an IntersectionObserver says the hero is off screen.
- Cap the hero at 30 fps (skip frames by time, not by guessing). When frames run slow (average > 40 ms over a second),
  drop detail: halve the point/instance count or the pixel ratio, and keep going.
- Heavy = average frame over `Design-Frame-Budget-Ms` in PROJECT.md (default 50 ms for WebGL stages, measured on the capturing machine).

## Start from material
Use the team's own material first: logo, mascot, photos, map, the real product screen. List what exists (`web/public`, `assets/`,
links in IDEA.md) before designing, and build around it. Then generated material. Only then the MotionSites media shelf.
Imagery gene is **3D cut-out**: a "product screenshot" is a real capture of the running product's screen, never a fake built from divs.
If the product cannot be captured yet, pick another imagery treatment and say so at the top of index.html in a comment.

## Subject world
Before designing, list 3-5 concrete things from this project's domain (objects, instruments, units, local vernacular; see
`../brief.md`) in a comment at the top of index.html, and use at least one as a visual element.

When done run `bash .uak/bin/uak design shoot R1 v2` and look at `1280.png` and `390.png`; fix what looks generic or broken.
Last, report what you spent: `bash .uak/bin/uak design done R1 v2 --tokens N` with your real token usage (skip it if you cannot know it; never guess).
