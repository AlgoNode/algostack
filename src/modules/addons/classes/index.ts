import { Addon } from '../enums.js';
import Category from './category.js';
import Arcs from './arcs.js';
import Nfds from './nfds.js';
import Icon from './icon.js';
import DecodeNotes from './notes.js';

export default {
  [Addon.CATEGORY]: Category,
  [Addon.ARCS]: Arcs,
  [Addon.NFDS]: Nfds,
  [Addon.ICON]: Icon,
  [Addon.DECODENOTES]: DecodeNotes,
}