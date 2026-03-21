/**
 * particles.js
 *
 * Manages the canvas render loop, particle system, and ambient motes.
 *
 * Design decisions:
 *   - Single RAF loop owns the canvas entirely (no shimmer vs frame conflict).
 *   - Particle stagger uses frame-counted birth delays instead of setTimeout,
 *     eliminating the race where delayed timeouts fired after textarea reset.
 *   - Object-pool pattern: particles pushed immediately, dormant until birthDelay=0.
 *   - ctx.font set once per spawn call (not per particle draw) via a shared cache.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const PARTICLE_FONT   = "400 {sz}px 'Playfair Display',Georgia,serif"
const MOTE_COLOR      = 'rgba(93,138,158,'
const MOTE_COUNT      = 10
const FRAMES_PER_CHAR = 0.3   // 0.3 frames × 60fps ≈ 5ms per char — matches old timing
const FRAMES_PER_LINE = 0.84  // ≈ 14ms between lines at 60fps

// ─── State ───────────────────────────────────────────────────────────────────

/** @type {HTMLCanvasElement} */
let canvas
/** @type {CanvasRenderingContext2D} */
let ctx
/** @type {Particle[]} */
const pool = []
/** @type {Mote[]} */
let motes = []
let rafId = null

// ─── Particle ─────────────────────────────────────────────────────────────────

class Particle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} ch      - single character
   * @param {number} sz      - font size in px
   * @param {number} birthDelay - frames to wait before becoming active
   */
  constructor(x, y, ch, sz, birthDelay) {
    this.x  = x
    this.y  = y
    this.ch = ch
    this.sz = sz
    this.birthDelay = birthDelay

    // Physics
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5
    const speed = 0.32 + Math.random() * 1.05
    this.vx  = Math.cos(angle) * speed
    this.vy  = Math.sin(angle) * speed
    this.wf  = 0.018 + Math.random() * 0.036   // wobble frequency
    this.wa  = 0.22  + Math.random() * 0.85    // wobble amplitude
    this.ph  = Math.random() * Math.PI * 2     // wobble phase
    this.rot = (Math.random() - 0.5) * 0.25
    this.rs  = (Math.random() - 0.5) * 0.011  // rotation speed

    // Lifetime
    this.t = 0
    this.T = 88 + Math.random() * 52

    // Colour: warm brown (60%) or slate-blue tint (40%) — mirrors the palette
    const icy  = Math.random() < 0.4
    this.colR  = icy ?  80 + Math.random() * 30 :  40 + Math.random() * 20
    this.colG  = icy ? 110 + Math.random() * 30 :  38 + Math.random() * 18
    this.colB  = icy ? 128 + Math.random() * 30 :  35 + Math.random() * 15
  }

  /** @returns {boolean} true while alive */
  tick() {
    if (this.birthDelay > 0) { this.birthDelay--; return true }

    this.t++
    const p   = this.t / this.T
    this.alpha = Math.pow(1 - p, 1.85)
    this.scale = 1 - p * 0.32
    this.x    += this.vx + Math.sin(this.t * this.wf + this.ph) * this.wa * 0.07
    this.y    += this.vy
    this.vy   -= 0.009   // gentle upward acceleration
    this.rot  += this.rs
    return this.t < this.T
  }

  draw() {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rot)
    ctx.scale(this.scale, this.scale)
    ctx.font      = PARTICLE_FONT.replace('{sz}', this.sz)
    ctx.fillStyle = `rgb(${this.colR | 0},${this.colG | 0},${this.colB | 0})`
    ctx.fillText(this.ch, 0, 0)
    ctx.restore()
  }
}

// ─── Motes (ambient shimmer) ──────────────────────────────────────────────────

class Mote {
  constructor() {
    this.x  = Math.random() * innerWidth
    this.y  = Math.random() * innerHeight
    this.r  = Math.random() * 0.8 + 0.3
    this.a  = Math.random() * 0.04 + 0.008
    this.vx = (Math.random() - 0.5) * 0.08
    this.vy = -(Math.random() * 0.11 + 0.03)
  }

  tick() {
    this.x += this.vx
    this.y += this.vy
    if (this.y < -8) {
      this.y = innerHeight + 8
      this.x = Math.random() * innerWidth
    }
    if (this.x < -8 || this.x > innerWidth + 8) this.vx *= -1
  }

  draw() {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
    ctx.fillStyle = MOTE_COLOR + this.a + ')'
    ctx.fill()
  }
}

// ─── Unified render loop ──────────────────────────────────────────────────────
// One loop, always running. Owns the canvas exclusively.

function loop() {
  rafId = requestAnimationFrame(loop)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Motes (always visible in background)
  motes.forEach(m => { m.tick(); m.draw() })

  // Particles (tick returns false when lifetime ends → remove)
  for (let i = pool.length - 1; i >= 0; i--) {
    if (pool[i].tick()) pool[i].draw()
    else pool.splice(i, 1)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise canvas and start the render loop.
 * @param {HTMLCanvasElement} el
 */
export function initRenderer(el) {
  canvas = el
  ctx    = canvas.getContext('2d')
  motes  = Array.from({ length: MOTE_COUNT }, () => new Mote())

  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight }
  resize()
  addEventListener('resize', resize)

  loop()
}

/**
 * Spawn disintegration particles from the characters in `text`,
 * positioned to match the rendered layout of `sourceEl`.
 *
 * Uses frame-counted birth delays (no setTimeout) so all particles
 * enter the pool synchronously — safe to reset the textarea immediately.
 *
 * @param {string}          text
 * @param {HTMLTextAreaElement} sourceEl
 */
export function spawnParticles(text, sourceEl) {
  const rect  = sourceEl.getBoundingClientRect()
  const cs    = getComputedStyle(sourceEl)
  const fs    = parseFloat(cs.fontSize)
  const lh    = parseFloat(cs.lineHeight) || fs * 1.65
  const pt    = parseFloat(cs.paddingTop)  || 0
  const pl    = parseFloat(cs.paddingLeft) || 0
  const scrollY = sourceEl.scrollTop

  // Measure characters using canvas (accurate for proportional fonts)
  ctx.font = PARTICLE_FONT.replace('{sz}', fs)

  let frameDelay = 0

  text.split('\n').forEach((line, lineIdx) => {
    const baseY = rect.top + pt + fs + lineIdx * lh - scrollY

    // Cull lines outside the visible textarea viewport
    if (baseY < rect.top - lh || baseY > rect.bottom + lh) {
      frameDelay += line.length * FRAMES_PER_CHAR
      return
    }

    let charX = rect.left + pl

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      const cw = ctx.measureText(ch).width

      if (ch.trim()) {
        const delay = Math.round(frameDelay + i * FRAMES_PER_CHAR)
        const sx    = charX + cw * 0.5 + (Math.random() - 0.5) * 3
        const sy    = baseY            + (Math.random() - 0.5) * 3
        const sz    = fs * (0.80 + Math.random() * 0.40)
        pool.push(new Particle(sx, sy, ch, sz, delay))
      }

      charX += cw
    }

    frameDelay += FRAMES_PER_LINE
  })
}
