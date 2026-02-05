import { vi } from 'vitest';

if (typeof window !== 'undefined') {
  window.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(cb, 16));
  window.cancelAnimationFrame = window.cancelAnimationFrame || ((id) => clearTimeout(id));
  window.open = window.open || vi.fn();
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = HTMLCanvasElement.prototype.getContext || (() => {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: (text) => ({ width: (text || '').length * 8 })
    };
  });
}
