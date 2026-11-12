// Keyboard input. Arrow keys / WASD move one square: up, down, left or right only
// (no diagonals — every step is exactly one square, so steps can be counted).
// While a popup is open every key goes to the popup instead.

const MOVE = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export function setupInput({ isModalOpen, onModalKey, onMove, onKey }) {
  window.addEventListener('keydown', (e) => {
    if (isModalOpen()) {
      onModalKey(e);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // let people type in any text box outside popups
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const mv = MOVE[e.code];
    if (mv) {
      e.preventDefault();
      onMove(mv[0], mv[1], e.repeat);
      return;
    }
    onKey(e);
  });
}
