const resolvePaperUrls = (paper) => {
  const rawUrl = paper?.url || '';
  const fallback = {
    previewUrl: rawUrl,
    externalUrl: rawUrl,
    forceExternal: false
  };

  if (!rawUrl) {
    return fallback;
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    const forceExternal = host === 'proceedings.neurips.cc' || host === 'research.google';

    if (forceExternal) {
      return {
        previewUrl: '',
        externalUrl: rawUrl,
        forceExternal: true
      };
    }

    if (host === 'ar5iv.labs.arxiv.org' && path.startsWith('/html/')) {
      const arxivId = path.slice('/html/'.length);
      if (arxivId) {
        return {
          previewUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
          externalUrl: rawUrl,
          forceExternal: false
        };
      }
    }

    if (host === 'ar5iv.org' && path.startsWith('/abs/')) {
      const arxivId = path.slice('/abs/'.length);
      if (arxivId) {
        return {
          previewUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
          externalUrl: `https://arxiv.org/abs/${arxivId}`,
          forceExternal: false
        };
      }
    }

    if (host.endsWith('arxiv.org') && path.startsWith('/abs/')) {
      const arxivId = path.slice('/abs/'.length);
      if (arxivId) {
        return {
          previewUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
          externalUrl: rawUrl,
          forceExternal: false
        };
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
};

export class UI {
  constructor() {
    this.hudStop = document.getElementById('hud-stop');
    this.hudTitle = document.getElementById('hud-title');
    this.hudProgressBar = document.getElementById('hud-progress-bar');
    this.hudWarning = document.getElementById('hud-warning');

    this.interaction = document.getElementById('interaction');
    this.interactionTitle = document.getElementById('interaction-title');
    this.viewerCloseHint = document.getElementById('viewer-close-hint');
    this.focusHint = document.getElementById('focus-hint');

    this.toasts = document.getElementById('toasts');

    this.viewer = document.getElementById('viewer');
    this.viewerTitle = document.getElementById('viewer-title');
    this.viewerClose = document.getElementById('viewer-close');
    this.viewerNewTab = document.getElementById('viewer-newtab');
    this.viewerIframe = document.getElementById('viewer-iframe');
    this.viewerFallback = document.getElementById('viewer-fallback');
    this.viewerLoading = document.getElementById('viewer-loading');

    this.diagnostics = document.getElementById('diagnostics');
    this.diagLoaded = document.getElementById('diag-loaded');
    this.diagValidation = document.getElementById('diag-validation');
    this.diagStop = document.getElementById('diag-stop');
    this.diagSpeed = document.getElementById('diag-speed');
    this.diagnosticsVisible = false;

    this.viewerOpen = false;
    this.currentUrl = '';
    this.loadTimer = null;
    this.iframeLoaded = false;
    this.viewerFallbackShown = false;
    this.focusHintDismissed = false;

    this.viewerClose.addEventListener('click', () => this.closeViewer());
    this.viewerNewTab.addEventListener('click', () => {
      if (this.currentUrl) {
        window.open(this.currentUrl, '_blank', 'noopener');
      }
    });
  }

  getDefaultFallbackMessage() {
    return 'Preview unavailable in this embedded view. Use "Open in new tab".';
  }

  showViewerFallback(message, toastMessage = null) {
    if (!this.viewerOpen) {
      return;
    }

    const firstShow = !this.viewerFallbackShown;
    this.viewerFallbackShown = true;
    this.viewerFallback.textContent = message || this.getDefaultFallbackMessage();
    this.viewerLoading.classList.add('hidden');
    this.viewerFallback.classList.remove('hidden');

    if (firstShow && toastMessage) {
      this.showToast(toastMessage, { type: 'warning' });
    }
  }

  iframeLooksLikeErrorPage() {
    if (!this.viewerIframe || !this.viewerIframe.src) {
      return true;
    }

    try {
      const href = this.viewerIframe.contentWindow?.location?.href || '';
      if (
        !href ||
        href === 'about:blank' ||
        href.startsWith('chrome-error://') ||
        href.startsWith('edge-error://') ||
        href.startsWith('about:neterror')
      ) {
        return true;
      }

      const bodyText = (
        this.viewerIframe.contentWindow?.document?.body?.innerText || ''
      ).toLowerCase();
      if (
        bodyText.includes('refused to connect') ||
        bodyText.includes('displayed in a frame') ||
        bodyText.includes('frame because it set') ||
        bodyText.includes('cannot be reached')
      ) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  setFocusHint(visible) {
    if (this.focusHintDismissed) {
      this.focusHint.classList.add('hidden');
      return;
    }
    this.focusHint.classList.toggle('hidden', !visible);
  }

  dismissFocusHint() {
    this.focusHintDismissed = true;
    this.focusHint.classList.add('hidden');
  }

  updateHud({ stop, expectedTotal, loadedCount }) {
    const currentId = stop ? stop.id : '--';
    this.hudStop.textContent = `STOP ${currentId} / ${expectedTotal}`;
    this.hudTitle.textContent = stop ? stop.title : '';

    const progressValue = stop ? stop.id : 0;
    const progressPercent = expectedTotal
      ? Math.max(0, Math.min(100, (progressValue / expectedTotal) * 100))
      : 0;
    this.hudProgressBar.style.width = `${progressPercent}%`;

    if (loadedCount < expectedTotal) {
      this.hudWarning.textContent = `Only ${loadedCount} of ${expectedTotal} loaded`;
      this.hudWarning.classList.remove('hidden');
    } else {
      this.hudWarning.classList.add('hidden');
    }
  }

  updateInteraction({ stop, visible }) {
    if (visible && stop) {
      this.interactionTitle.textContent = stop.title;
      this.interaction.classList.remove('hidden');
    } else {
      this.interactionTitle.textContent = '';
      this.interaction.classList.add('hidden');
    }
  }

  showToast(message, { type = 'info', duration = 4500 } = {}) {
    if (!this.toasts) {
      return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`.trim();
    toast.textContent = message;
    this.toasts.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.remove();
      }, duration);
    }
  }

  openPaper(paper) {
    if (!paper) {
      return;
    }

    const { previewUrl, externalUrl, forceExternal } = resolvePaperUrls(paper);

    this.viewerOpen = true;
    this.currentUrl = externalUrl;
    this.viewerTitle.textContent = paper.title;
    this.viewer.classList.remove('hidden');
    this.viewer.setAttribute('aria-hidden', 'false');
    this.viewerCloseHint.classList.remove('hidden');

    this.viewerFallback.classList.add('hidden');
    this.viewerLoading.classList.remove('hidden');
    this.iframeLoaded = false;
    this.viewerFallbackShown = false;
    this.viewerFallback.textContent = this.getDefaultFallbackMessage();

    if (this.loadTimer) {
      clearTimeout(this.loadTimer);
    }

    this.viewerIframe.onload = () => {
      if (!this.viewerOpen) {
        return;
      }

      if (this.iframeLooksLikeErrorPage()) {
        this.showViewerFallback(
          this.getDefaultFallbackMessage(),
          'Preview failed to load. Use "Open in new tab".'
        );
        return;
      }

      this.iframeLoaded = true;
      this.viewerLoading.classList.add('hidden');
      this.viewerFallback.classList.add('hidden');
    };

    this.viewerIframe.onerror = () => {
      this.showViewerFallback(
        this.getDefaultFallbackMessage(),
        'Embed blocked. Use "Open in new tab".'
      );
    };

    if (forceExternal || !previewUrl) {
      this.viewerIframe.onload = null;
      this.viewerIframe.onerror = null;
      this.viewerIframe.src = 'about:blank';
      this.showViewerFallback(
        'Inline preview is unavailable for this source. Use "Open in new tab".'
      );
      return;
    }

    this.viewerIframe.src = previewUrl;

    this.loadTimer = setTimeout(() => {
      if (!this.iframeLoaded) {
        this.showViewerFallback(
          this.getDefaultFallbackMessage(),
          'This site may block embedding. Try "Open in new tab".'
        );
      }
    }, 5000);
  }

  closeViewer() {
    if (!this.viewerOpen) {
      return;
    }

    this.viewerOpen = false;
    this.viewer.classList.add('hidden');
    this.viewer.setAttribute('aria-hidden', 'true');
    this.viewerCloseHint.classList.add('hidden');
    this.viewerIframe.onload = null;
    this.viewerIframe.onerror = null;
    this.viewerIframe.src = 'about:blank';
    this.viewerFallback.classList.add('hidden');
    this.viewerLoading.classList.add('hidden');
    this.viewerFallbackShown = false;

    if (this.loadTimer) {
      clearTimeout(this.loadTimer);
      this.loadTimer = null;
    }
  }

  isViewerOpen() {
    return this.viewerOpen;
  }

  toggleDiagnostics() {
    this.diagnosticsVisible = !this.diagnosticsVisible;
    this.diagnostics.classList.toggle('hidden', !this.diagnosticsVisible);
  }

  updateDiagnostics({ loadedCount, validationOk, nearestStopId, speed }) {
    if (!this.diagnosticsVisible) {
      return;
    }
    this.diagLoaded.textContent = String(loadedCount);
    this.diagValidation.textContent = validationOk ? 'ok' : 'issues';
    this.diagStop.textContent = nearestStopId ? String(nearestStopId) : '--';
    const safeSpeed = Number.isFinite(speed) ? speed : 0;
    this.diagSpeed.textContent = safeSpeed.toFixed(1);
  }
}
