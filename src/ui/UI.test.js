import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UI } from './UI.js';

const setupDom = () => {
  document.body.innerHTML = `
    <div id="hud-stop"></div>
    <div id="hud-title"></div>
    <div id="hud-progress-bar"></div>
    <div id="hud-warning" class="hidden"></div>
    <div id="interaction" class="hidden"></div>
    <div id="interaction-title"></div>
    <div id="viewer-close-hint" class="hidden"></div>
    <div id="focus-hint"></div>
    <div id="toasts"></div>
    <div id="viewer" class="hidden"></div>
    <div id="viewer-title"></div>
    <button id="viewer-close"></button>
    <button id="viewer-newtab"></button>
    <div id="viewer-fallback" class="hidden"></div>
    <div id="viewer-loading" class="hidden"></div>
    <iframe id="viewer-iframe"></iframe>
    <div id="diagnostics" class="hidden"></div>
    <div id="diag-loaded"></div>
    <div id="diag-validation"></div>
    <div id="diag-stop"></div>
    <div id="diag-speed"></div>
  `;
};

const stubIframeNavigation = () => {
  const iframe = document.getElementById('viewer-iframe');
  let currentSrc = 'about:blank';
  Object.defineProperty(iframe, 'src', {
    configurable: true,
    get: () => currentSrc,
    set: (next) => {
      currentSrc = String(next);
    }
  });
  return iframe;
};

describe('UI', () => {
  beforeEach(() => {
    setupDom();
  });

  it('shows interaction hint when near a stop', () => {
    const ui = new UI();
    ui.updateInteraction({ stop: { title: 'Test Paper' }, visible: true });
    const interaction = document.getElementById('interaction');
    const title = document.getElementById('interaction-title');
    expect(interaction.classList.contains('hidden')).toBe(false);
    expect(title.textContent).toBe('Test Paper');
  });

  it('opens and closes the viewer modal', () => {
    vi.useFakeTimers();
    const iframe = stubIframeNavigation();
    const ui = new UI();
    const paper = { title: 'Paper', url: 'data:text/html,Paper' };

    ui.openPaper(paper);
    expect(ui.isViewerOpen()).toBe(true);
    expect(document.getElementById('viewer').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('viewer-close-hint').classList.contains('hidden')).toBe(false);
    expect(iframe.src).toContain('data:text/html,Paper');

    ui.closeViewer();
    expect(ui.isViewerOpen()).toBe(false);
    expect(document.getElementById('viewer').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('viewer-close-hint').classList.contains('hidden')).toBe(true);
    expect(iframe.src).toContain('about:blank');

    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows fallback when iframe resolves to an error page', () => {
    vi.useFakeTimers();
    const iframe = stubIframeNavigation();
    const ui = new UI();
    const paper = { title: 'Paper', url: 'data:text/html,Paper' };
    ui.iframeLooksLikeErrorPage = vi.fn(() => true);

    ui.openPaper(paper);
    iframe.onload();

    const fallback = document.getElementById('viewer-fallback');
    const loading = document.getElementById('viewer-loading');
    expect(fallback.classList.contains('hidden')).toBe(false);
    expect(loading.classList.contains('hidden')).toBe(true);

    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('uses arxiv pdf preview for ar5iv links', () => {
    vi.useFakeTimers();
    const iframe = stubIframeNavigation();
    const ui = new UI();
    const paper = {
      title: 'Attention Is All You Need',
      url: 'https://ar5iv.labs.arxiv.org/html/1706.03762'
    };

    ui.openPaper(paper);

    expect(iframe.src).toContain('https://arxiv.org/pdf/1706.03762.pdf');
    expect(ui.currentUrl).toBe('https://ar5iv.labs.arxiv.org/html/1706.03762');

    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('skips inline preview for known blocked hosts', () => {
    vi.useFakeTimers();
    const iframe = stubIframeNavigation();
    const ui = new UI();
    const paper = {
      title: 'NeurIPS paper',
      url: 'https://proceedings.neurips.cc/paper_files/paper/2012/hash/test-Abstract.html'
    };

    ui.openPaper(paper);

    const fallback = document.getElementById('viewer-fallback');
    expect(iframe.src).toContain('about:blank');
    expect(fallback.classList.contains('hidden')).toBe(false);
    expect(fallback.textContent).toContain('Inline preview is unavailable');
    expect(ui.currentUrl).toContain('https://proceedings.neurips.cc/');

    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });
});
