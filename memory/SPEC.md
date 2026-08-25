# Optik Sinar Baru — Virtual Try-On (SPEC)

## What the app does
Client-side virtual glasses try-on for the optical store "Optik Sinar Baru".
The customer opens the site, grants camera access, and a selected eyeglasses
frame is composited onto their face in real time. They can switch frames, take a
photo, save it, and contact the store on WhatsApp about the frame they tried.

## Stack / architecture
- Frontend only for app logic (no backend calls). FastAPI template backend is
  untouched and still serves `/api/` and `/api/status`.
- Face tracking: **real MediaPipe Face Landmarker** (`@mediapipe/tasks-vision`
  v1.0.1), `runningMode: "VIDEO"`, `numFaces: 2`,
  `outputFacialTransformationMatrixes: true`.
- **Self-hosted model + runtime** (no CDN): WASM at
  `frontend/public/mediapipe/wasm/`, model at
  `frontend/public/models/face_landmarker.task`.
- Rendering: `<video>` (object-fit: cover) with a `<canvas>` overlay on top;
  the render loop is pure `requestAnimationFrame` and mutates refs. React state
  is pushed at most ~4x/second (status pill + debug HUD).

## Key files
| Path | Role |
|---|---|
| `src/config/store.ts` | WhatsApp number (`GANTI_DENGAN_NOMOR_TOKO`), message template, tracking defaults, `formatRupiah` |
| `src/data/products.ts` | 6-frame catalog + calibration metadata (pure data) |
| `src/data/productRepository.ts` | Repository seam for a future DB/REST catalog |
| `src/lib/vto/faceTracking.ts` | Landmark math: cover-transform mapping, eye distance, roll, yaw/pitch from the 4x4 matrix |
| `src/lib/vto/glassesPosition.ts` | `GlassesPositioner` (smoothed transform), `drawGlasses`, `drawDebugOverlay` |
| `src/lib/vto/smoothing.ts` | `lerp`, `lerpAngle`, `clamp`, `RollingAverage` |
| `src/hooks/useCamera.ts` | getUserMedia lifecycle, facingMode switch, pause, error mapping |
| `src/hooks/useFaceLandmarker.ts` | Loads the FaceLandmarker task |
| `src/hooks/useTryOnEngine.ts` | rAF tracking loop + `capturePhoto()` compositor |
| `src/pages/Home.tsx` | Landing page, route `/` |
| `src/pages/VirtualTryOn.tsx` | Camera screen, route `/coba` |
| `src/lib/vto/faceShape.ts` | Face-shape metrics + rule classifier + `FaceShapeEstimator` (multi-frame averaging) |
| `src/data/faceShapeRecommendations.ts` | Shape → recommended frame ids + advice copy, `isRecommendedFrame`, `sortByRecommendation` |
| `src/lib/vto/calibration.ts` | Calibration override types, localStorage load/save, `applyCalibration`, `buildProductsSnippet` |
| `src/hooks/useCalibration.ts` | Calibration Studio state: slider overrides (persisted) + session-only PNG object URLs |
| `src/components/vto/*` | CameraControls, FrameCatalogSheet, ProductCard, FrameQuickBar, FaceStatusBanner, FaceShapeChip, FaceShapePicker, DebugMetricsHUD, CalibrationStudio, PhotoReviewModal, PrivacyBadge |
| `tools/build_frames.py` | Asset pipeline: chroma-keys green-screen product renders to alpha PNGs and auto-derives each frame's `scaleMultiplier`/`offsetX`/`offsetY` from the lens-hole centroids |

## Positioning model
- Anchor x = 0.35·eyeCenter + 0.65·noseBridge; anchor y = 0.78·eyeCenter + 0.22·noseBridge.
- `glassesWidth = interpupillaryDistance(px) × product.scaleMultiplier`.
- Roll from `atan2` of the eye line (mirror-corrected).
- Yaw squeezes the frame horizontally (`cos yaw`, floor 0.42) and slides it; pitch shifts it vertically.
- Smoothing: `lerp` / `lerpAngle` with a configurable factor (default 0.45, slider in debug HUD).
- Frame assets are photoreal transparent **PNGs** in `public/glasses/`, produced by
  `tools/build_frames.py`: product renders on a pure-green screen are chroma-keyed
  (ratio test + de-spill), cropped, resized to a 600px-wide canvas, and their two
  lens openings are found by flood fill. The calibration is then derived exactly:
  `scaleMultiplier = 600 / lensCentreDistance`,
  `offsetX = (300 - lensCentreX)/600`, `offsetY = (height/2 - lensCentreY)/600`.
  To swap in different photos, add the URL to `SOURCES` in that script and re-run
  `cd /app && python tools/build_frames.py`. Translucent frames need an opaque rim
  in the source render, or the green shows through and the rim gets keyed away.

## Key flows
1. `/` → **COBA SEKARANG** → `/coba`.
2. `/coba` auto-requests the camera, loads the landmarker, starts tracking.
3. Status banner states: requesting / permission denied / model loading / model
   error / paused / no face ("Posisikan wajahmu di depan kamera.") / multiple
   faces ("Pastikan hanya satu wajah...") / tracked.
4. **Model Kacamata** bottom sheet → pick a frame → **COBA FRAME INI**.
5. Shutter (**AMBIL FOTO**) freezes the video and opens the review modal:
   COBA FRAME LAIN / SIMPAN FOTO (PNG download) / TANYAKAN KE TOKO (WhatsApp).
6. Debug mode: `?debug=1` or the bug icon in the top HUD.
7. **Frame recommender**: while tracking, contour landmarks (cheekbones 234/454,
   jaw 172/397, forehead 103/332, chin 152, brow 10) are sampled **only on a
   near-frontal head** (|yaw| < 0.22, |pitch| < 0.26 rad) and averaged over ≥18
   frames, then classified into Oval / Bulat / Kotak / Hati / Panjang / Diamond
   from the height:cheek, jaw:cheek and forehead:cheek ratios. The camera screen
   shows a chip ("Wajah Oval — 3 frame cocok"); the catalog shows an advice
   banner, a **COCOK** badge on matching frames, and sorts matches first while
   still listing every frame. The customer can override the shape with the chip
   row in the sheet (`Otomatis (...)` restores auto-detection).

## Auth
None. No login, no accounts, no credentials anywhere in the app.

## Seed data
None in Mongo. The catalog is static TypeScript: SKUs OSB-001..OSB-006
(Classic Black 350000, Classic Brown 350000, Round Black 375000,
Round Gold 400000, Square Black 400000, Clear Frame 425000).

8. **Calibration Studio** (debug mode only, docked at the bottom so the face
   stays visible): upload a PNG for the selected frame (object URL — stays in the
   browser, never uploaded), adjust `scaleMultiplier` / `offsetX` / `offsetY` /
   `rotationOffset` / `opacity` live against your own face, collapse the panel,
   then **Copy products.ts** / **Unduh** to export a ready-to-paste catalog block.
   Overrides persist in `localStorage` under `osb.calibration.v1`; the circular
   arrow resets a frame to its catalog values.

## Known deviations
- WhatsApp number is intentionally the placeholder `GANTI_DENGAN_NOMOR_TOKO`
  (user's choice), so `wa.me` links carry only the prefilled text.
- Frame assets are AI-generated product photography, not your real stock photos —
  replace the URLs in `tools/build_frames.py` (or upload per-frame PNGs in the
  Calibration Studio) to use genuine product shots.
- Head yaw/pitch use a 2D perspective approximation, not full 3D rendering.
