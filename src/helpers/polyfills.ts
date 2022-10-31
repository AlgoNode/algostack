import { Buffer } from 'buffer';

export default function polyfills() {
  if (typeof window !== 'undefined') {
    (window as any).global = window;
    window.Buffer = window.Buffer || Buffer;
  }
  
  global.Buffer = global.Buffer || Buffer;
}