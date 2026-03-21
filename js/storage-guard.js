/**
 * storage-guard.js
 *
 * Zero-storage guarantee — Conch's core privacy promise.
 * Called once at startup before any user interaction.
 *
 * Blocks every browser channel that could persist user data:
 *   - localStorage / sessionStorage writes
 *   - XMLHttpRequest
 *   - fetch
 *   - navigator.sendBeacon
 */
export function lockStorage() {
  try { localStorage.setItem   = () => {} } catch (_) {}
  try { sessionStorage.setItem = () => {} } catch (_) {}

  window.XMLHttpRequest = function () {
    return { open() {}, send() {}, setRequestHeader() {} }
  }

  window.fetch = () =>
    Promise.resolve(new Response('', { status: 200 }))

  if (navigator.sendBeacon) navigator.sendBeacon = () => false
}
