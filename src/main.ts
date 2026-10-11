/** Boot. Everything after this line is either pure or the document. */

import './ui/book.css';
import './ui/weather.css';
import type { KeyValueStore } from './game/board/profile.js';
import { mountBoard } from './ui/board-book.js';

/** `localStorage`, or a map that forgets on reload when the browser won't give us one. */
function safeStore(): KeyValueStore {
  try {
    const probe = window.localStorage;
    probe.getItem('dashiell:detective');
    return probe;
  } catch {
    const data = new Map<string, string>();
    return {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  }
}

const root = document.getElementById('book');
if (root) mountBoard(root, safeStore());
