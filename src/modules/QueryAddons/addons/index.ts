import { Addon } from '../enums.js';
import Category from './Category.js';
import Arcs from './Arcs.js';
import Nfds from './Nfds.js';
import DecodeNotes from './Notes.js';

export default {
  [Addon.CATEGORY]: Category,
  [Addon.ARCS]: Arcs,
  [Addon.NFDS]: Nfds,
  [Addon.DECODENOTES]: DecodeNotes,
}