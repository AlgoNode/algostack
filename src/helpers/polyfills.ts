import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  (window as any).global = window;
}

global.Buffer = global.Buffer || Buffer;

export default {}