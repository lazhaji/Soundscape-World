# Liquid Glass core v1.0.0

Source: the user-invoked `liquid-glass-web` skill, `assets/liquid-glass.js`.
Upstream: https://github.com/gentpan/liquidglass / https://liquidglass.dev
License: MIT, copyright (c) 2026 gentpan; full notice in `LICENSE` and the deployed
`public/licenses/liquid-glass.txt`.

The engine is copied without changes. SHA-256:
`9176c0ccd5b6fc1d7f662d7706c5ce5ef80fb9b360638c01edff8989463e54b1`.
The adjacent declaration describes the subset used by our TypeScript wrapper.

Only the mode dialog's DND switch dynamically imports this module. The native
checkbox and CSS thumb remain functional if loading fails. The lens refracts a
small opaque decorative copy of the switch track, never the Three.js background
or text. The glass map uses scale 1; movement updates positions and press changes
the small lens shape. No additional WebGL renderer, component bundle, network
dependency, wallpaper, or third-party font is included.

The wrapper destroys filters, observers and springs on unmount or accessibility
preference changes. Reduced motion/transparency, higher contrast and forced
colors use the native/CSS fallback. Upstream's small bounded map cache and one
empty shared SVG definitions root can remain after unmount; live filters do not.

Upstream browser claims are not project validation. Real iOS Safari / Android
testing is still required; see `docs/TEST_PLAN.md`.
