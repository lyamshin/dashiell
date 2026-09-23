/** Boot. Everything after this line is either pure or the document. */

import './ui/book.css';
import './ui/grid.css';
import './ui/m9.css';
import { mount } from './ui/book.js';

const root = document.getElementById('book');
if (root) mount(root);
