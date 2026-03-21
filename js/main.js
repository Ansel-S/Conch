/**
 * main.js
 *
 * Application entry point.
 * Wires DOM events → particle system → release flow.
 */

import { lockStorage }               from './storage-guard.js'
import { initRenderer, spawnParticles } from './particles.js'

// ─── Boot ─────────────────────────────────────────────────────────────────────

lockStorage()

const ta  = document.getElementById('ta')
const btn = document.getElementById('btn')
const cnt = document.getElementById('cnt')
const cv  = document.getElementById('c')

initRenderer(cv)
setTimeout(() => ta.focus(), 350)

// ─── Input state ──────────────────────────────────────────────────────────────

ta.addEventListener('input', () => {
  const n = ta.value.length
  btn.classList.toggle('on', n > 0)
  cnt.textContent = n || ''
  cnt.classList.toggle('on', n > 0)
})

// ─── Keyboard shortcut: ⌘ / Ctrl + Enter ─────────────────────────────────────

ta.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && ta.value.trim()) release()
})

btn.addEventListener('click', release)

// ─── Release ──────────────────────────────────────────────────────────────────

function release() {
  const text = ta.value
  if (!text.trim()) return

  // 1. Lock UI
  document.body.classList.add('go')

  // 2. Fade text out visually
  ta.style.transition = 'color 0.18s, opacity 0.18s'
  ta.style.color      = 'transparent'
  ta.style.opacity    = '0'

  // 3. Push all particles into pool synchronously (frame-based delays — no setTimeout race)
  spawnParticles(text, ta)

  // 4. Reset textarea after fade completes (particles are already safe in pool)
  setTimeout(() => {
    ta.value = ''
    cnt.classList.remove('on')
    btn.classList.remove('on')

    // Snap-remove inline styles without flashing a transition
    ta.style.transition = 'none'
    ta.style.color      = ''
    ta.style.opacity    = ''

    // Re-enable transitions on next frame
    requestAnimationFrame(() => {
      ta.style.transition = ''
      document.body.classList.remove('go')
      ta.focus()
    })
  }, 220) // just long enough for the 0.18s fade + one frame buffer
}
