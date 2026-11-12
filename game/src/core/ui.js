// Shared popups used by every level. Each returns a Promise, so level code can
// simply `await` a conversation or a question.
//
//   dialog({ speaker, sprite, lines })                     -> true when finished
//   choice({ title, text, speaker, sprite, options, cancelValue }) -> chosen option.value
//   panel({ title, html, buttons, closeKeys, wide })       -> clicked button value (null on close key)
//   form({ title, html, fields, buttons, validate })       -> { button, values }
//   toast(html)
//
// Only one popup shows at a time; extra requests queue up.
import { spriteUrl } from './assets.js';

let current = null;
const queue = [];
const rootEl = () => document.getElementById('modal-root');

export const isOpen = () => current !== null;
export function handleKey(e) {
  if (current && current.onKey) current.onKey(e);
}

function show(builder) {
  return new Promise((resolve) => {
    queue.push({ builder, resolve });
    if (!current) openNext();
  });
}

function openNext() {
  const root = rootEl();
  const item = queue.shift();
  if (!item) {
    current = null;
    root.hidden = true;
    root.innerHTML = '';
    return;
  }
  root.hidden = false;
  root.innerHTML = '';
  const modal = { onKey: null, afterOpen: null };
  let closed = false;
  const close = (value) => {
    if (closed) return;
    closed = true;
    current = null;
    item.resolve(value);
    openNext();
  };
  current = modal;
  root.appendChild(item.builder(modal, close));
  if (modal.afterOpen) modal.afterOpen();
}

const isConfirm = (e) => e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space';
const portrait = (name) => (name ? `<img class="portrait" src="${spriteUrl(name)}" alt="">` : '');

function makeEl(className, html) {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = html;
  return el;
}

function addButtons(row, buttons, onPick) {
  return buttons.map((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = b.label;
    if (b.primary) btn.classList.add('primary');
    btn.addEventListener('click', () => onPick(b));
    row.appendChild(btn);
    return btn;
  });
}

export function dialog({ speaker, sprite, lines }) {
  return show((modal, close) => {
    let i = 0;
    const el = makeEl(
      'modal dialog',
      `${portrait(sprite)}<div class="dialog-body">${speaker ? `<div class="speaker">${speaker}</div>` : ''}
       <div class="dialog-text"></div>
       <div class="dialog-foot"><span class="dialog-count"></span><span><span class="key">Enter</span> next</span></div></div>`
    );
    const textEl = el.querySelector('.dialog-text');
    const countEl = el.querySelector('.dialog-count');
    const render = () => {
      textEl.innerHTML = lines[i];
      countEl.textContent = lines.length > 1 ? `${i + 1} / ${lines.length}` : '';
    };
    const advance = () => {
      i++;
      if (i >= lines.length) close(true);
      else render();
    };
    modal.onKey = (e) => {
      if (e.repeat) return;
      if (isConfirm(e)) {
        e.preventDefault();
        advance();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        close(true);
      }
    };
    el.addEventListener('click', advance);
    render();
    return el;
  });
}

export function choice({ title, text, speaker, sprite, options, cancelValue }) {
  return show((modal, close) => {
    const el = makeEl(
      'modal choice',
      `${portrait(sprite)}<div class="dialog-body">
        ${title ? `<h2>${title}</h2>` : ''}${speaker ? `<div class="speaker">${speaker}</div>` : ''}
        ${text ? `<div class="dialog-text">${text}</div>` : ''}
        <ul class="options"></ul>
        <div class="dialog-foot"><span><span class="key">↑</span><span class="key">↓</span> choose &nbsp;<span class="key">Enter</span> select</span>
        ${cancelValue !== undefined ? '<span><span class="key">Esc</span> back</span>' : ''}</div></div>`
    );
    const list = el.querySelector('.options');
    let sel = options.findIndex((o) => !o.disabled);
    const items = options.map((opt, idx) => {
      const li = document.createElement('li');
      li.className = 'option' + (opt.disabled ? ' disabled' : '');
      li.innerHTML = `<span class="opt-num">${idx < 9 ? idx + 1 : ''}</span><span class="opt-label">${opt.label}</span>${
        opt.hint ? `<span class="opt-hint">${opt.hint}</span>` : ''
      }`;
      li.addEventListener('click', () => !opt.disabled && close(opt.value));
      li.addEventListener('mouseenter', () => {
        if (!opt.disabled) { sel = idx; paint(); }
      });
      list.appendChild(li);
      return li;
    });
    const paint = () => items.forEach((li, i) => li.classList.toggle('selected', i === sel));
    const move = (d) => {
      if (sel < 0) return;
      let j = sel;
      for (let k = 0; k < options.length; k++) {
        j = (j + d + options.length) % options.length;
        if (!options[j].disabled) { sel = j; break; }
      }
      paint();
      items[sel].scrollIntoView({ block: 'nearest' });
    };
    modal.onKey = (e) => {
      const c = e.code;
      if (c === 'ArrowUp' || c === 'KeyW') { e.preventDefault(); move(-1); return; }
      if (c === 'ArrowDown' || c === 'KeyS') { e.preventDefault(); move(1); return; }
      if (e.repeat) return;
      if (isConfirm(e)) { e.preventDefault(); if (sel >= 0) close(options[sel].value); }
      else if (c === 'Escape') { e.preventDefault(); if (cancelValue !== undefined) close(cancelValue); }
      else if (/^(Digit|Numpad)[1-9]$/.test(c)) {
        const k = Number(c.slice(-1)) - 1;
        if (options[k] && !options[k].disabled) close(options[k].value);
      }
    };
    paint();
    return el;
  });
}

export function panel({ title, html, buttons = [{ label: 'Close', value: true, primary: true }], closeKeys = ['Escape'], wide = false }) {
  return show((modal, close) => {
    const el = makeEl(`modal panel${wide ? ' modal-wide' : ''}`, `${title ? `<h2>${title}</h2>` : ''}<div class="panel-body">${html}</div><div class="buttons"></div>`);
    let sel = Math.max(0, buttons.findIndex((b) => b.primary));
    const btns = addButtons(el.querySelector('.buttons'), buttons, (b) => close(b.value));
    const paint = () => btns.forEach((b, i) => b.classList.toggle('selected', i === sel && btns.length > 1));
    modal.onKey = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Tab') {
        e.preventDefault();
        const d = e.code === 'ArrowLeft' || (e.code === 'Tab' && e.shiftKey) ? -1 : 1;
        sel = (sel + d + btns.length) % btns.length;
        paint();
        return;
      }
      if (e.repeat) return;
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
        e.preventDefault();
        if (buttons[sel]) close(buttons[sel].value);
      } else if (closeKeys.includes(e.code)) {
        e.preventDefault();
        close(null);
      }
    };
    paint();
    return el;
  });
}

/**
 * Number-entry form. validate(values, attempt) returns an error message (HTML) or null.
 * Buttons: { label, value, primary, cancel, skipValidate }.
 */
export function form({ title, html = '', fields, buttons = [{ label: 'OK', value: 'ok', primary: true }], validate }) {
  return show((modal, close) => {
    const el = makeEl(
      'modal form',
      `${title ? `<h2>${title}</h2>` : ''}<div class="panel-body">${html}</div><div class="fields"></div>
       <div class="form-error" hidden></div><div class="buttons"></div>`
    );
    const fieldsEl = el.querySelector('.fields');
    const errEl = el.querySelector('.form-error');
    const inputs = {};
    for (const f of fields) {
      const wrap = document.createElement('label');
      wrap.className = 'field';
      wrap.innerHTML = `<span>${f.label}</span>`;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'decimal';
      inp.autocomplete = 'off';
      inp.value = f.value ?? '';
      inp.placeholder = f.placeholder || '';
      wrap.appendChild(inp);
      fieldsEl.appendChild(wrap);
      inputs[f.id] = inp;
    }
    let attempts = 0;
    const values = () => Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.value]));
    const submit = (b) => {
      if (!b.skipValidate && validate) {
        attempts++;
        const err = validate(values(), attempts);
        if (err) {
          errEl.innerHTML = err;
          errEl.hidden = false;
          el.classList.remove('shake');
          void el.offsetWidth; // restart the animation
          el.classList.add('shake');
          return;
        }
      }
      close({ button: b.value, values: values() });
    };
    addButtons(el.querySelector('.buttons'), buttons, submit);
    const primary = buttons.find((b) => b.primary) || buttons[0];
    const cancel = buttons.find((b) => b.cancel);
    modal.onKey = (e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        if (!e.repeat) submit(primary);
      } else if (e.code === 'Escape' && cancel) {
        e.preventDefault();
        close({ button: cancel.value, values: values() });
      }
    };
    modal.afterOpen = () => {
      const first = Object.values(inputs)[0];
      if (first) { first.focus(); first.select(); }
    };
    return el;
  });
}

let toastTimer = null;
export function toast(html, ms = 2600) {
  const el = document.getElementById('toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
