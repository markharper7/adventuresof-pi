// Plays conversations written in npc_dialogue.js.
import * as ui from './ui.js';
import { CHARACTERS, DIALOGUE } from '../../npc_dialogue.js';

export { DIALOGUE, CHARACTERS };

/** Replace {name} placeholders with values from vars (unknown ones are left as-is). */
export const fill = (line, vars = {}) => line.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** Play one interaction: an array of { speaker: [lines] } speeches, in order. */
export async function play(interaction, vars = {}) {
  for (const speech of interaction) {
    for (const [who, lines] of Object.entries(speech)) {
      const c = CHARACTERS[who] || { name: who };
      await ui.dialog({ speaker: c.name, sprite: c.sprite, lines: lines.map((l) => fill(l, vars)) });
    }
  }
}
