// Compact tokenizer compatibility layer for ChatGPT Model Injector Pro.
// This file intentionally exposes the same global used by the full o200k_base bundle.
// It is lightweight and approximate, but keeps context counting available without a build step.

(function () {
  'use strict';

  function segment(text) {
    const input = String(text || '');
    const parts = input.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[A-Za-z0-9_]+|\S|\s+/gu) || [];
    return parts.flatMap((part) => {
      if (/^\s+$/.test(part)) return part.length > 1 ? [' '] : [];
      if (/^[A-Za-z0-9_]+$/.test(part)) {
        return part.match(/.{1,4}/g) || [];
      }
      return [part];
    });
  }

  function encode(text) {
    return segment(text).map((part) => {
      let hash = 2166136261;
      for (let i = 0; i < part.length; i += 1) {
        hash ^= part.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    });
  }

  function countTokens(text) {
    return encode(text).length;
  }

  window.GPTTokenizer_o200k_base = {
    encode,
    countTokens,
    name: 'compact-o200k-compatible-estimator',
    exact: false
  };
})();
