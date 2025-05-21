# Echo — Semantic Embedding Fractal Explorer

> *Turn text into geometry and watch meaning come alive.*

Echo is a **100 % client-side** React + Vite playground that converts an OpenAI embedding vector into a flame-fractal and renders it in real time on an HTML canvas.  The fractal acts as a _3-dimensional projection_ of the high-dimensional semantic space, allowing you to _see_ how two phrases relate by comparing shapes, colours and density.

---

## How it works

1. **Embedding**  – When you enter a piece of text we call the `text-embedding-3-small` model to obtain a 64-D vector that situates the text in OpenAI's semantic space.
2. **Dimensional reduction** – The vector is normalised and sliced into groups of coefficients which feed directly into the parameters of an *Iterated Function System* (IFS):
   * Affine transform matrix entries (⟨a,b,c,d,e,f⟩)
   * Variation function weights (linear, sinusoidal, swirl, polar, …)
   * Colour‐space dynamics (H,S,L deltas)
   This mapping collapses the 64 numbers down to **3 conceptually orthogonal sets** → position, distortion & colour.  In effect we have projected the semantic vector onto a 3-axis visual basis.
3. **Rendering** – A million points are iteratively sampled through the IFS and plotted on an HTML canvas (see `src/utils/flameFractal.ts`).  The point cloud is eventually perceived as a *3-D object* because of the density fall-off and colour modulation.

The result: two semantically similar inputs produce fractals with visibly overlapping skeletons, while unrelated phrases diverge dramatically.

---

## Quick start

```bash
# 1. install root dependencies (monorepo workspace)
npm install

# 2. run the Vite dev server
npm run dev:frontend
```

Then open `http://localhost:5173` and start typing in the **Fractal Controls** panel.

---

## Repository layout

```
apps/
  frontend/           # React + Typescript source
    src/
      components/     # UI & canvas widgets
      context/        # Global fractal state via React context
      utils/          # Embedding fetch, IFS maths, similarity metrics
```  
Top-level scripts (`package.json`) just cd into `apps/frontend`.

---

## FAQ

**Is this really 3-D?**  Technically the canvas is 2-D but the intensity/colour gradient encodes a Z-axis, giving an illusion of depth.  Swap the renderer for WebGL or p5.js if you need true XYZ points.

---

