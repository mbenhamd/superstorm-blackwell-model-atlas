/**
 * Focus return for overlays opened from app state rather than a Radix Trigger (evidence sheet, ⌘K,
 * experiment dialog). Radix only restores focus to its own Trigger; without one focus falls to <body>.
 * The opener is recorded when an overlay opens from page content; opening one overlay from another
 * (⌘K → evidence sheet) keeps the original page opener, so Escape lands where the user started.
 */
let opener: HTMLElement | null = null;
/** How to find the opener again if React re-mounted it while the overlay was open (same role and accessible text). */
let openerKey: { tag: string; label: string } | null = null;

const labelOf = (el: HTMLElement) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();

export function rememberOpener(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && !active.closest("[role='dialog'],[role='alertdialog']")) {
    opener = active;
    openerKey = { tag: active.tagName, label: labelOf(active) };
  }
}

function findOpener(): HTMLElement | null {
  if (opener?.isConnected) return opener;
  if (!openerKey?.label) return null;
  const key = openerKey;
  const main = document.getElementById("main-content") ?? document.body;
  const matches = [...main.querySelectorAll<HTMLElement>(key.tag.toLowerCase())].filter((el) => labelOf(el) === key.label && !el.closest("[role='dialog']"));
  return matches.length === 1 ? matches[0]! : null;
}

/** onCloseAutoFocus handler. `stillCovered` is true when another overlay is taking over focus. */
export function restoreOpener(event: Event, stillCovered = false): void {
  event.preventDefault();
  if (stillCovered) return;
  const target = findOpener();
  opener = null;
  openerKey = null;
  if (target) { target.focus({ preventScroll: true }); return; }
  // Nothing recorded (or already restored by a later overlay whose close finished first): only rescue focus
  // that fell to <body>, so a late close of an earlier overlay never pulls focus off the restored opener.
  const current = document.activeElement;
  if (!current || current === document.body) document.getElementById("main-content")?.focus({ preventScroll: true });
}
