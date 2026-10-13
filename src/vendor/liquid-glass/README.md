# Liquid Glass engines — upstream v1.0.0

Source: installed `liquid-glass-web` skill, `assets/liquid-glass.js` and
`assets/glass-webgl.js`. Upstream: https://github.com/gentpan/liquidglass and
https://liquidglass.dev/lib/. MIT (c) 2026 gentpan; full notice in `LICENSE` and
`public/licenses/liquid-glass.txt` (verified in the production output).

Both JavaScript files are copied without source changes. On 2026-10-13, their
contents were fetched from liquidglass.dev and compared after CRLF -> LF
normalization: both equal. The different byte hashes below are line endings.

| File | Installed skill / vendored SHA-256 | Website SHA-256 (LF) |
| --- | --- | --- |
| liquid-glass.js | 9176c0ccd5b6fc1d7f662d7706c5ce5ef80fb9b360638c01edff8989463e54b1 | 92a62e5b80cfa7e03912b13bdc53aff1c0ae367a5f296de1327e0f62f0579210 |
| glass-webgl.js | 19b8b97d63d975805d951779c7cb8714112721e052bac4df53d0b8039ca8c3d3 | 0cdc8def96c2c67facafe029ca1a564da0df270fb089d7f30c6defe4606b0fce |

## Current integration

`src/ui/LiquidStatus.tsx` uses `createGlassRenderer`, the upstream map generator,
shader and `createSpring`. `TrainDemoScene.FrameOutput` renders Three once, then
synchronously supplies that frame to the UI compositor. The wrapper copies only
the lens's rectangular region to a reusable 2D canvas and uploads it to the
upstream WebGL renderer, at pixelRatio 1. It does not use preserveDrawingBuffer,
a background screenshot, CSS backdrop-filter, a second 3D scene or a CDN.

Closed optics reproduce the upstream button defaults (14/.8/3/.12/.6/1.5).
Expanded optics interpolate to panel defaults (24/.3/4/.1/.5/2). These numbers are
refraction/bezel/curvature/chroma/specular/specularWidth. The upstream WebGL
shader does not implement blur, so the adapter applies the panel's 2px frost
with native Canvas2D filter to a padded source region before refraction. This
adaptation is verified in Chromium; other engines remain to be tested.

There is one live Three context plus one small glass context during selection;
the latter is released on unmount. Springs, event listeners, observer, textures,
buffers and program are cleaned up. StrictMode's effect replay does not lose the
still-mounted canvas context. Glass failure is explicit and retryable.

Local declarations describe only the used API. The previous DND-only SVG switch
and old mode panel were removed. No example wallpaper, third-party font or
component bundle ships in the app. Test copies under ignored `output/playwright`
are local verification artifacts, not application assets.

See `docs/M2_REWORK_REPORT.md` for actual evidence and remaining limitations.
Upstream browser claims are not this project's test results.
