// Model Injector Pro — background service worker.
// Handles opt-in egress-IP geolocation lookups and the Accept-Language
// session rule used by the privacy spoofing feature.

const GEO_CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const LEGACY_ACCEPT_LANGUAGE_RULE_ID = 4101;
const GLOBAL_MAIN_FRAME_RULE_ID = 4201;
const GLOBAL_INITIATOR_RULE_ID = 4202;
const ACCEPT_LANGUAGE_RULE_BASE = 100000;
const SUPPORTED_REQUEST_DOMAINS = ['chatgpt.com', 'chat.openai.com'];
const ACCEPT_LANGUAGE_RESOURCE_TYPES = [
  'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
  'object', 'xmlhttprequest', 'ping', 'csp_report', 'media',
  'websocket', 'webbundle', 'other',
];

let geoCache = null;
let geoCacheAt = 0;
let geoInFlight = null;

const COUNTRY_LANGUAGES = {
  CN: ['zh-CN'],
  TW: ['zh-TW'],
  HK: ['zh-HK'],
  SG: ['en', 'zh-CN'],
  JP: ['ja'],
  KR: ['ko'],
  US: ['en-US'],
  GB: ['en-GB'],
  CA: ['en-CA'],
  AU: ['en-AU'],
  NZ: ['en-NZ'],
  IE: ['en-IE'],
  IN: ['en-IN', 'hi'],
  DE: ['de'],
  AT: ['de-AT'],
  CH: ['de', 'fr', 'it'],
  FR: ['fr'],
  BE: ['nl', 'fr'],
  NL: ['nl'],
  ES: ['es'],
  MX: ['es-MX'],
  AR: ['es-AR'],
  CL: ['es-CL'],
  CO: ['es-CO'],
  PT: ['pt'],
  BR: ['pt-BR'],
  IT: ['it'],
  RU: ['ru'],
  UA: ['uk', 'ru'],
  PL: ['pl'],
  CZ: ['cs'],
  SE: ['sv'],
  NO: ['nb'],
  DK: ['da'],
  FI: ['fi'],
  TR: ['tr'],
  SA: ['ar'],
  AE: ['ar'],
  IL: ['he'],
  TH: ['th'],
  VN: ['vi'],
  ID: ['id'],
  MY: ['ms', 'en-MY'],
  PH: ['en-PH', 'fil'],
};

function timeoutSignal(ms) {
  return typeof AbortSignal !== 'undefined' && AbortSignal.timeout
    ? AbortSignal.timeout(ms)
    : undefined;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: timeoutSignal(FETCH_TIMEOUT_MS),
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function pickLanguages(data) {
  if (Array.isArray(data.languages) && data.languages.length) {
    return data.languages.map(item => String(item).toLowerCase()).filter(Boolean);
  }
  const code = String(data.country_code || data.countryCode || '').toUpperCase();
  return COUNTRY_LANGUAGES[code] || [];
}

function normalizeGeo(data) {
  if (!data || typeof data !== 'object') return null;
  const ip = data.ip || data.query || '';
  const countryCode = String(data.country_code || data.countryCode || '').toUpperCase();
  if (!ip && !countryCode) return null;
  return {
    ip,
    country: data.country || '',
    countryCode,
    city: data.city || '',
    timezone: data.timezone?.id || data.timezone || '',
    languages: pickLanguages(data),
    at: Date.now(),
  };
}

async function lookupGeo(force) {
  if (!force && geoCache && Date.now() - geoCacheAt < GEO_CACHE_TTL_MS) return geoCache;
  if (!force && geoInFlight) return geoInFlight;

  geoInFlight = (async () => {
    const endpoints = [
      () => fetchJson('https://ipwho.is/'),
      () => fetchJson('https://get.geojs.io/v1/ip/geo.json'),
      () => fetchJson('https://ipapi.co/json/'),
    ];
    let lastError = null;
    for (const load of endpoints) {
      try {
        const geo = normalizeGeo(await load());
        if (geo) {
          geoCache = geo;
          geoCacheAt = Date.now();
          return geo;
        }
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('geo unavailable');
  })();

  try {
    return await geoInFlight;
  } finally {
    geoInFlight = null;
  }
}

function acceptLanguageRuleId(tabId) {
  return ACCEPT_LANGUAGE_RULE_BASE + Math.max(0, Number(tabId) || 0);
}

function acceptLanguageAction(value) {
  return {
    type: 'modifyHeaders',
    requestHeaders: [{ header: 'Accept-Language', operation: 'set', value }],
  };
}

async function setPersistentAcceptLanguageRules(enabled, value) {
  const removeRuleIds = [GLOBAL_MAIN_FRAME_RULE_ID, GLOBAL_INITIATOR_RULE_ID];
  const addRules = !enabled || !value ? [] : [
    {
      id: GLOBAL_MAIN_FRAME_RULE_ID,
      priority: 1,
      action: acceptLanguageAction(value),
      condition: {
        requestDomains: SUPPORTED_REQUEST_DOMAINS,
        resourceTypes: ['main_frame'],
      },
    },
    {
      id: GLOBAL_INITIATOR_RULE_ID,
      priority: 1,
      action: acceptLanguageAction(value),
      condition: {
        initiatorDomains: SUPPORTED_REQUEST_DOMAINS,
        resourceTypes: ACCEPT_LANGUAGE_RESOURCE_TYPES.filter(type => type !== 'main_frame'),
      },
    },
  ];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

async function setAcceptLanguageRule(tabId, enabled, value) {
  if (!Number.isInteger(tabId)) return { ok: false, error: 'missing tab id' };
  const ruleId = acceptLanguageRuleId(tabId);
  try {
    await setPersistentAcceptLanguageRules(enabled, value);
    const existing = await chrome.declarativeNetRequest.getSessionRules();
    const removeRuleIds = existing
      .filter(rule => rule.id === LEGACY_ACCEPT_LANGUAGE_RULE_ID
        || rule.id === ruleId
        || rule.condition?.tabIds?.includes(tabId))
      .map(rule => rule.id);
    if (!enabled || !value) {
      if (removeRuleIds.length) {
        await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds });
      }
      return { ok: true };
    }
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds,
      addRules: [{
        id: ruleId,
        priority: 2,
        action: acceptLanguageAction(value),
        condition: {
          tabIds: [tabId],
          resourceTypes: ACCEPT_LANGUAGE_RESOURCE_TYPES,
        },
      }],
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error && error.message || error) };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;
  if (message.type === 'mi-geo') {
    lookupGeo(Boolean(message.force))
      .then(geo => sendResponse({ ok: true, geo }))
      .catch(error => sendResponse({ ok: false, error: String(error && error.message || error) }));
    return true;
  }
  if (message.type === 'mi-accept-language') {
    setAcceptLanguageRule(sender.tab?.id, Boolean(message.enabled), String(message.value || ''))
      .then(result => sendResponse(result));
    return true;
  }
  return false;
});


chrome.tabs.onRemoved.addListener(tabId => {
  const ruleId = acceptLanguageRuleId(tabId);
  chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] }).catch(() => {});
});
