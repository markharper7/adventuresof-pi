import { Game } from './core/game.js';

const game = new Game();
window.piGame = game; // handy for poking at the game from the browser console

game.boot().catch((err) => {
  console.error(err);
  const pre = document.createElement('pre');
  pre.className = 'fatal';
  pre.textContent = 'The game failed to start:\n' + (err.stack || err);
  document.body.appendChild(pre);
});
