# Conch

> *A place to let go of thoughts. Nothing is saved. Ever.*

Conch is an ephemeral expression tool. You type anything — anger, anxiety, the thought you can't tell anyone — and release it. The text disintegrates into particles and vanishes. No storage, no network, no trace.

---

## Why

Most tools are designed to *save*. Conch is designed to *discard*.

The act of writing is therapeutic even without a reader. But knowing that text *could* be recovered creates a silent self-censorship. Conch removes that possibility at the technical level, not just the policy level.

---

## Features

- **Zero storage** — `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, and `sendBeacon` are all blocked at runtime
- **Particle disintegration** — text dissolves into characters that drift upward and fade
- **Golden-ratio layout** — content sits at 38.2% from the top (1/φ²), textarea proportioned to match
- **8px spacing grid** — all spacing is a multiple of 8px
- **WCAG AA compliant** — all interactive text meets 4.5:1 contrast minimum on the warm background
- **No dependencies** — pure HTML, CSS, ES Modules; ~9 KB total
- **Keyboard shortcut** — `⌘ Enter` / `Ctrl Enter` to release

---

## Structure

```
conch/
├── index.html          — markup, semantic HTML, ARIA labels
└── src/
    ├── style.css       — design tokens, golden-ratio layout, all styles
    ├── main.js         — app entry point, DOM wiring, release flow
    ├── particles.js    — unified RAF loop, Particle class, Mote class, spawnParticles()
    └── storage-guard.js — zero-storage guarantee, called before any user interaction
```

---

## Technical notes

### Single render loop
All canvas drawing — ambient motes *and* disintegration particles — runs in one `requestAnimationFrame` loop (`particles.js → loop()`). Earlier designs had two independent loops sharing a canvas, causing clear/draw interleaving and visible flicker.

### Frame-based stagger (no `setTimeout`)
Particle spawn delay is a `birthDelay` frame counter on each `Particle` instance. Particles enter the pool synchronously; they simply no-op until `birthDelay` reaches zero. This removes the previous race condition where `setTimeout`-staggered particles could spawn *after* the textarea had already been reset.

### Contrast ratios (background `#f0ece6`)
| Token | Hex | Ratio | Level |
|---|---|---|---|
| `--t` main text | `#2c2926` | 12.3:1 | AAA |
| `--tm` button / label | `#5e5850` | 5.9:1 | AA |
| `--tl` wordmark / count | `#928b83` | 2.9:1 | decorative |
| `--th` placeholder | `#c2bbb2` | 1.6:1 | intentional |

---

## License

MIT
