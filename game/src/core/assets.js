// Loads the sprite images listed in assets/theme.js.
import { SPRITES } from '../../assets/theme.js';

const images = {};

export function loadSprites() {
  return Promise.all(
    Object.entries(SPRITES).map(
      ([name, src]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            images[name] = img;
            resolve();
          };
          img.onerror = () => {
            console.warn(`Sprite "${name}" failed to load from ${src}`);
            resolve(); // the renderer draws a placeholder instead
          };
          img.src = src;
        })
    )
  );
}

export const sprite = (name) => images[name] || null;
export const spriteUrl = (name) => SPRITES[name] || '';
