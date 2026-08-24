// Model Injector Pro — isolated-world bridge.
// The main content script runs in the MAIN world and cannot reach
// chrome.runtime, so it talks to this bridge over window events.

(() => {
  if (window.__miBridgeInstalled) return;
  window.__miBridgeInstalled = true;

  const REQUEST_EVENT = 'mi-geo-request';
  const RESPONSE_EVENT = 'mi-geo-response';
  const BRIDGE_TIMEOUT_MS = 14000;

  function callBackground(message) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('bridge timeout'));
        }
      }, BRIDGE_TIMEOUT_MS);
      try {
        chrome.runtime.sendMessage(message, response => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(response);
        });
      } catch (error) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
      }
    });
  }

  window.addEventListener(REQUEST_EVENT, event => {
    const detail = event.detail;
    if (!detail || typeof detail.seq === 'undefined') return;
    callBackground(detail.message || {})
      .then(result => (result && typeof result === 'object' ? result : { ok: true }))
      .catch(error => ({ ok: false, error: String(error && error.message || error) }))
      .then(payload => {
        window.dispatchEvent(new CustomEvent(RESPONSE_EVENT, {
          detail: { seq: detail.seq, ...payload },
        }));
      });
  });
})();
