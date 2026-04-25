// ChatGPT Model Injector Pro - content script
// Manifest V3 main-world script. Keeps all state in browser storage/localStorage.

(function () {
  'use strict';

  const PREFIX = 'cgpt_mi_';
  const MODELS_ENDPOINT = '/backend-api/models';
  const ACCOUNT_ENDPOINT = '/backend-api/accounts/check';
  const CONVERSATION_HINTS = [
    '/backend-api/conversation',
    '/backend-api/f/conversation',
    '/backend-api/codex/responses',
    '/backend-api/gizmos',
    '/backend-api/gpts'
  ];

  const PRESET_MODELS = [
    { id: 'auto', name: 'Auto / 不覆盖', effort: false, tokens: 0 },
    { id: 'gpt-5-5-thinking', name: 'GPT-5.5 Thinking', effort: true, tokens: 196000 },
    { id: 'gpt-5-5-pro', name: 'GPT-5.5 Pro', effort: true, tokens: 196000 },
    { id: 'gpt-5-4-thinking', name: 'GPT-5.4 Thinking', effort: true, tokens: 196000 },
    { id: 'gpt-5-4-pro', name: 'GPT-5.4 Pro', effort: true, tokens: 196000 },
    { id: 'gpt-5-3', name: 'GPT-5.3 Instant', effort: false, tokens: 128000 },
    { id: 'gpt-4o', name: 'GPT-4o', effort: false, tokens: 128000 },
    { id: 'gpt-4.1', name: 'GPT-4.1', effort: false, tokens: 1000000 },
    { id: 'o3', name: 'o3', effort: true, tokens: 200000 },
    { id: 'o4-mini', name: 'o4-mini', effort: true, tokens: 200000 }
  ];

  const EFFORTS = [
    ['light', 'Light'],
    ['standard', 'Standard'],
    ['extended', 'Extended'],
    ['heavy', 'Heavy']
  ];

  const defaultState = {
    enabled: false,
    model: 'auto',
    customModel: '',
    effort: 'standard',
    debug: false,
    discovered: [],
    lastAccount: null,
    updatedAt: null
  };

  const state = loadState();
  const tokenCache = new Map();
  let ui = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(PREFIX + 'state');
      if (!raw) return { ...defaultState };
      const parsed = JSON.parse(raw);
      return { ...defaultState, ...parsed };
    } catch (_) {
      return { ...defaultState };
    }
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(PREFIX + 'state', JSON.stringify(state));
    renderStatus();
  }

  function log(...args) {
    if (state.debug) console.debug('[ModelInjector]', ...args);
  }

  function normalizeUrl(input) {
    try {
      if (typeof input === 'string') return input;
      if (input && typeof input.url === 'string') return input.url;
      return String(input || '');
    } catch (_) {
      return '';
    }
  }

  function isConversationWrite(url) {
    return CONVERSATION_HINTS.some((item) => url.includes(item));
  }

  function selectedModel() {
    if (!state.enabled) return null;
    if (state.model === 'custom') return state.customModel.trim() || null;
    if (state.model === 'auto') return null;
    return state.model;
  }

  function selectedEntry() {
    const id = state.model === 'custom' ? state.customModel.trim() : state.model;
    return allModels().find((item) => item.id === id) || null;
  }

  function shouldApplyEffort() {
    const entry = selectedEntry();
    if (entry && entry.effort) return true;
    return /(^o\d|thinking|reason|pro)/i.test(selectedModel() || '');
  }

  function patchPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;

    const model = selectedModel();
    if (model) {
      payload.model = model;
      payload.model_slug = model;
      payload.target_model = model;
    }

    if (model && shouldApplyEffort()) {
      payload.reasoning_effort = state.effort;
      payload.effort = state.effort;
      payload.metadata = {
        ...(payload.metadata || {}),
        reasoning_effort: state.effort,
        model_injector: true
      };
    }

    return payload;
  }

  function patchBody(body) {
    if (!state.enabled || typeof body !== 'string') return body;
    const trimmed = body.trim();
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return body;
    try {
      const parsed = JSON.parse(trimmed);
      const patched = patchPayload(parsed);
      return JSON.stringify(patched);
    } catch (error) {
      log('Failed to patch body', error);
      return body;
    }
  }

  function captureModels(data) {
    const next = [];
    const seen = new Set();

    function push(model) {
      if (!model || typeof model !== 'object') return;
      const id = String(model.slug || model.id || model.model || '').trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      next.push({
        id,
        name: String(model.title || model.name || model.display_name || id),
        effort: Boolean(model.reasoning || model.supports_reasoning || /(^o\d|thinking|reason|pro)/i.test(id)),
        tokens: Number(model.max_tokens || model.context_window || model.context_length || model.token_limit || 0) || 0,
        source: 'api'
      });
    }

    function walk(value, depth = 0) {
      if (!value || depth > 5) return;
      if (Array.isArray(value)) {
        value.forEach((item) => walk(item, depth + 1));
        return;
      }
      if (typeof value === 'object') {
        push(value);
        Object.keys(value).forEach((key) => {
          if (/models|items|data|categories|groups|default/i.test(key)) walk(value[key], depth + 1);
        });
      }
    }

    walk(data);
    if (next.length) {
      state.discovered = next.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      saveState();
      renderModelOptions();
      log('Captured models', next.length);
    }
  }

  function installNetworkHooks() {
    const originalFetch = window.fetch;
    if (typeof originalFetch === 'function' && !originalFetch.__miPatched) {
      const wrappedFetch = async function patchedFetch(input, init) {
        const url = normalizeUrl(input);
        let nextInit = init;

        if (isConversationWrite(url) && init && typeof init.body === 'string') {
          nextInit = { ...init, body: patchBody(init.body) };
        }

        const response = await originalFetch.call(this, input, nextInit);

        if (url.includes(MODELS_ENDPOINT)) {
          response.clone().json().then(captureModels).catch(() => {});
        }
        if (url.includes(ACCOUNT_ENDPOINT)) {
          response.clone().json().then((data) => {
            state.lastAccount = data;
            saveState();
          }).catch(() => {});
        }
        return response;
      };
      wrappedFetch.__miPatched = true;
      window.fetch = wrappedFetch;
    }

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      this.__miUrl = String(url || '');
      this.__miMethod = String(method || 'GET').toUpperCase();
      return originalOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function patchedSend(body) {
      let nextBody = body;
      if (this.__miMethod !== 'GET' && isConversationWrite(this.__miUrl)) {
        nextBody = patchBody(body);
      }
      this.addEventListener('load', () => {
        try {
          if (this.__miUrl.includes(MODELS_ENDPOINT) && this.responseText) captureModels(JSON.parse(this.responseText));
        } catch (_) {}
      });
      return originalSend.call(this, nextBody);
    };
  }

  function allModels() {
    const merged = [];
    const seen = new Set();
    for (const item of [...PRESET_MODELS, ...(state.discovered || [])]) {
      if (!item || !item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    merged.push({ id: 'custom', name: 'Custom / 自定义', effort: true, tokens: 0 });
    return merged;
  }

  function countTokens(text) {
    if (!text) return 0;
    if (tokenCache.has(text)) return tokenCache.get(text);
    let count = 0;
    try {
      const tokenizer = window.GPTTokenizer_o200k_base;
      if (tokenizer && typeof tokenizer.countTokens === 'function') count = tokenizer.countTokens(text);
      else if (tokenizer && typeof tokenizer.encode === 'function') count = tokenizer.encode(text).length;
      else count = Math.ceil(text.length / 4);
    } catch (_) {
      count = Math.ceil(text.length / 4);
    }
    tokenCache.set(text, count);
    if (tokenCache.size > 300) tokenCache.delete(tokenCache.keys().next().value);
    return count;
  }

  function collectConversationText() {
    const parts = [];
    const nodes = document.querySelectorAll('[data-message-author-role], textarea, [contenteditable="true"]');
    nodes.forEach((node) => {
      const text = node.value || node.innerText || node.textContent || '';
      const clean = text.trim();
      if (clean && clean.length < 200000) parts.push(clean);
    });
    return parts.join('\n\n');
  }

  function formatTokens(value) {
    if (!Number.isFinite(value)) return '-';
    if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return String(value);
  }

  function injectStyles() {
    if (document.getElementById('mi-style')) return;
    const style = document.createElement('style');
    style.id = 'mi-style';
    style.textContent = `
      #mi-root{position:fixed;right:16px;bottom:84px;z-index:2147483647;font:13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827}
      #mi-root *{box-sizing:border-box}
      .mi-fab{width:52px;height:52px;border:0;border-radius:18px;background:linear-gradient(135deg,#111827,#2563eb);color:#fff;box-shadow:0 16px 40px rgba(0,0,0,.25);cursor:pointer;font-weight:700}
      .mi-panel{display:none;width:330px;margin-bottom:10px;padding:14px;border-radius:20px;background:rgba(255,255,255,.96);box-shadow:0 24px 70px rgba(15,23,42,.28);backdrop-filter:blur(16px);border:1px solid rgba(148,163,184,.35)}
      .mi-open .mi-panel{display:block}
      .mi-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:800;font-size:14px}
      .mi-row{margin:10px 0}.mi-row label{display:block;margin-bottom:5px;color:#475569;font-size:12px}
      .mi-select,.mi-input{width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#111827;outline:none}
      .mi-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.mi-btn{border:0;border-radius:12px;padding:9px 10px;background:#e2e8f0;color:#0f172a;cursor:pointer;font-weight:700}.mi-btn.primary{background:#2563eb;color:#fff}.mi-btn.warn{background:#f97316;color:#fff}
      .mi-efforts{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.mi-effort{font-size:11px;border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:7px 3px;cursor:pointer}.mi-effort.active{border-color:#2563eb;background:#dbeafe;color:#1d4ed8;font-weight:800}
      .mi-status{margin-top:10px;padding:9px;border-radius:12px;background:#f8fafc;color:#334155;font-size:12px;white-space:pre-line}.mi-on{color:#059669;font-weight:800}.mi-off{color:#dc2626;font-weight:800}
      .mi-small{color:#64748b;font-size:11px;margin-top:8px}
      @media (prefers-color-scheme:dark){#mi-root{color:#e5e7eb}.mi-panel{background:rgba(15,23,42,.95);border-color:rgba(71,85,105,.8)}.mi-select,.mi-input{background:#020617;color:#e5e7eb;border-color:#475569}.mi-btn{background:#334155;color:#e5e7eb}.mi-effort{background:#020617;color:#e5e7eb;border-color:#475569}.mi-effort.active{background:#1e3a8a;color:#bfdbfe}.mi-status{background:#0f172a;color:#cbd5e1}.mi-row label,.mi-small{color:#94a3b8}}
    `;
    document.documentElement.appendChild(style);
  }

  function mountUi() {
    if (document.getElementById('mi-root')) return;
    injectStyles();
    const root = document.createElement('div');
    root.id = 'mi-root';
    root.innerHTML = `
      <div class="mi-panel">
        <div class="mi-title"><span>Model Injector Pro</span><span id="mi-led"></span></div>
        <div class="mi-row"><label>目标模型</label><select class="mi-select" id="mi-model"></select></div>
        <div class="mi-row" id="mi-custom-row"><label>自定义 model slug</label><input class="mi-input" id="mi-custom" placeholder="例如：gpt-5-5-thinking" /></div>
        <div class="mi-row"><label>Reasoning effort</label><div class="mi-efforts" id="mi-efforts"></div></div>
        <div class="mi-actions"><button class="mi-btn primary" id="mi-toggle"></button><button class="mi-btn" id="mi-refresh">刷新模型</button></div>
        <div class="mi-actions"><button class="mi-btn" id="mi-debug">调试日志</button><button class="mi-btn warn" id="mi-reset">重置</button></div>
        <div class="mi-status" id="mi-status">初始化中...</div>
        <div class="mi-small">只修改本地网页请求参数，最终权限由 ChatGPT 服务端决定。</div>
      </div>
      <button class="mi-fab" id="mi-fab" title="ChatGPT Model Injector Pro">MI</button>
    `;
    document.documentElement.appendChild(root);
    ui = {
      root,
      model: root.querySelector('#mi-model'),
      customRow: root.querySelector('#mi-custom-row'),
      custom: root.querySelector('#mi-custom'),
      efforts: root.querySelector('#mi-efforts'),
      toggle: root.querySelector('#mi-toggle'),
      refresh: root.querySelector('#mi-refresh'),
      debug: root.querySelector('#mi-debug'),
      reset: root.querySelector('#mi-reset'),
      status: root.querySelector('#mi-status'),
      led: root.querySelector('#mi-led')
    };

    root.querySelector('#mi-fab').addEventListener('click', () => root.classList.toggle('mi-open'));
    ui.model.addEventListener('change', () => { state.model = ui.model.value; saveState(); renderAll(); });
    ui.custom.addEventListener('input', () => { state.customModel = ui.custom.value; saveState(); });
    ui.toggle.addEventListener('click', () => { state.enabled = !state.enabled; saveState(); renderAll(); });
    ui.debug.addEventListener('click', () => { state.debug = !state.debug; saveState(); renderAll(); });
    ui.reset.addEventListener('click', () => { Object.assign(state, defaultState); saveState(); renderAll(); });
    ui.refresh.addEventListener('click', () => refreshModels());

    renderAll();
    setInterval(renderStatus, 2500);
  }

  function renderModelOptions() {
    if (!ui) return;
    const value = state.model;
    ui.model.innerHTML = '';
    for (const item of allModels()) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.tokens ? `${item.name} · ${formatTokens(item.tokens)}` : item.name;
      ui.model.appendChild(option);
    }
    ui.model.value = value;
  }

  function renderEfforts() {
    if (!ui) return;
    ui.efforts.innerHTML = '';
    for (const [id, label] of EFFORTS) {
      const button = document.createElement('button');
      button.className = 'mi-effort' + (state.effort === id ? ' active' : '');
      button.textContent = label;
      button.addEventListener('click', () => { state.effort = id; saveState(); renderAll(); });
      ui.efforts.appendChild(button);
    }
  }

  function renderStatus() {
    if (!ui) return;
    const text = collectConversationText();
    const tokens = countTokens(text);
    const model = selectedModel() || 'auto';
    const entry = selectedEntry();
    const limit = entry && entry.tokens ? entry.tokens : 0;
    const ratio = limit ? ` / ${formatTokens(limit)} (${Math.min(100, Math.round(tokens / limit * 100))}%)` : '';
    ui.toggle.textContent = state.enabled ? '暂停覆盖' : '启用覆盖';
    ui.debug.textContent = state.debug ? '关闭日志' : '调试日志';
    ui.led.innerHTML = state.enabled ? '<span class="mi-on">ON</span>' : '<span class="mi-off">OFF</span>';
    ui.customRow.style.display = state.model === 'custom' ? 'block' : 'none';
    ui.status.textContent = `状态：${state.enabled ? '启用' : '暂停'}\n模型：${model}\nEffort：${state.effort}\n估算上下文：${formatTokens(tokens)} tokens${ratio}\n发现模型：${(state.discovered || []).length}`;
  }

  function renderAll() {
    renderModelOptions();
    renderEfforts();
    if (ui) ui.custom.value = state.customModel || '';
    renderStatus();
  }

  async function refreshModels() {
    try {
      const response = await fetch(MODELS_ENDPOINT, { credentials: 'include' });
      const data = await response.json();
      captureModels(data);
    } catch (error) {
      log('Model refresh failed', error);
      renderStatus();
    }
  }

  installNetworkHooks();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUi, { once: true });
  } else {
    mountUi();
  }

  setTimeout(mountUi, 1500);
})();
