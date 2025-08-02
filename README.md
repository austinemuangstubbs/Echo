# Echo — Semantic Embedding ⇢ Fractal Flame Visualiser

> _“Turn language into geometry and **see** semantics.”_

Echo is a **100 % client-side** playground written in React/Typescript that converts any piece of text into a unique flame-fractal.  
Every pixel you see is generated in-browser – no WebGL, no server.  The app exploits a curious property of **Iterated Function Systems**: small, continuous changes in their coefficients create recognisable morphs in the final image. By seeding those coefficients with OpenAI embeddings we obtain a _visual manifold_ of natural-language meaning.

---

## 1 Pipeline

```
[text] ─▶ embeddings (64-D) ─▶ param-mapper ─▶ flame-engine ─▶ HTMLCanvas
                                   ▲                       │
                                   └─────── gallery / png ─┘
```

1. **Embedding**   `text-embedding-3-small` returns a 64-element float vector.
2. **Parameterisation**   `createFractalParamsFromEmbeddings(…)` (≈80 LOC)
   • slices the vector into three orthogonal domains:
   - **Geometry**   8 affine matrices _Aᵢ ∈ R²ˣ² + bᵢ ∈ R²_
   - **Variation mix**   8-way softmax → weight per non-linear basis fn (linear, sinusoidal, swirl, polar, spherical, …)
   - **Colour field**   HSL base + Δspeed + Δshift (9 scalars)
3. **Flame iteration**   `renderFlameFractal(…)` traces **1 × 10⁶** samples through the IFS:
   ```ts
   for (let i=0;i<iterations;i++) {
     const [T, ci] = getRandomTransform(table);   // alias-sampled by weight
     P = T(P);                                    // affine + variation
     drawPoint(ctx, P, colour(ci, P));            // α-blended dot ≈ 0.6px
   }
   ```
   – executed in ~16 ms tiles to keep the main thread responsive and stream progress to the UI.
4. **Persistence & Hi-res export**   The final canvas is committed to **IndexedDB** (via Dexie) together with the embedding + params.  A hidden off-screen canvas can re-render the same point-cloud at _N×_ resolution for a lossless PNG.

---

## 2 Flame Engine Details (`src/utils/flameFractal.ts` ≈ 400 LOC)

• **Transform-table build** – each entry is `[p ↦ Vᵢ(Aᵢ p + bᵢ), weightᵢ, index]`.  
• **Variation library** – 8 classic functions ported from Scott Draves’/_Apophysis_ formulas (linear, sinusoidal, spherical, swirl, horseshoe, polar, handkerchief, disc).  
• **Determinant guard** – affine matrices are boosted if `|det| < 0.1` to avoid degenerate collapses.  
• **Device-pixel scaling** – the engine queries `window.devicePixelRatio` and draws in physical pixels while maintaining abstract [-1,1] world units.  
• **Colour synthesis** – hue is spaced by `360/8°` per branch and modulated per-point:  
  `h = base + branchShift + speed·x + shift·y` → smooth gradient ribbons.
• **Progressive render** – batches of 1 000 points are pumped via `requestAnimationFrame` achieving 60 fps UI whilst the fractal converges.

Engineering flex: _no_ external math lib, everything is hand-rolled, tree-shaken < 8 kB gz.

---

## 3 Frontend Architecture

* **React Context (`FractalContext.tsx`)** acts as the single source of truth – inputs, canvas ref, gallery, toasts.
* **Canvas component** is a 12 line wrapper; all heavy-lifting lives in the engine, keeping React render cycles cheap.
* **Dexie + IndexedDB** provides an offline cache capped ⁓75 MB / 30 fractals with quota warnings.
* **Comparative metrics** – `similarity.ts` exports Levenshtein + cosine distance for experimental clustering/UX.
* **Responsive UI** built with plain CSS `glass-panel` aesthetic; no Tailwind/Bulma overhead.

---

## 4 Running / Developing

```bash
# workspace root
npm i              # installs root + apps/frontend via npm-workspaces
npm run dev        # == vite dev --prefix apps/frontend
```
Visit <http://localhost:5173>.  Use your own **OpenAI API key** (stored only in `localStorage`).

### Scripts

* `dev` / `build` / `preview` – proxy to Vite
* `lint` – `eslint . --max-warnings 0`
* `format` – `prettier --write "**/*.{ts,tsx,css,md}"`

---

## 5 Why flame fractals?

The flame algorithm is _continuous_ with respect to its parameters – perfect for mapping high-dimensional vectors. Small edits in the input sentence rotate / shear / colour-shift the attractor in predictable, _visually smooth_ ways, making semantic neighbourhoods instantly recognisable.

---

## 6 Acknowledgements

Inspired by Scott Draves’ _Flame algorithm_ and Jonathan McCabe’s colour-cycling tricks.  
