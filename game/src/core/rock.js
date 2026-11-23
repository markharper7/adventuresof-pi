// A lumpy asteroid, shared by the levels that build or shoot rocks (Level 5, Level 7).
import { mulberry32 } from './utils.js';

/** The rock outline: radius multipliers round the edge, made once. */
export const ROCK_SHAPE = (() => {
  const rng = mulberry32(55);
  return Array.from({ length: 11 }, () => 0.82 + rng() * 0.18);
})();

/** Draw a rock centred at pixel (px, py). colors = [light, mid, dark] for the shading. */
export function drawRock(ctx, px, py, radius, rot, colors, shape = ROCK_SHAPE) {
  radius = Math.max(1.5, radius);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot);
  ctx.beginPath();
  shape.forEach((s, i) => {
    const a = (i / shape.length) * Math.PI * 2;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * radius * s, Math.sin(a) * radius * s);
  });
  ctx.closePath();
  const g = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.6, colors[1]);
  g.addColorStop(1, colors[2]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}
