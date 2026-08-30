// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

export function injectApiKey(config, apiKey) {
  if (!apiKey || !config) {
    return;
  }

  config.global ||= {};
  if ('sdk_api_key' in config.global) {
    config.global.sdk_api_key = apiKey;
  }
  if ('api_key' in config.global) {
    config.global.api_key = apiKey;
  }

  for (const source of Object.values(config.sources || {})) {
    if (typeof source.url === 'string' && source.url.includes('nextzen.org')) {
      source.url_params ||= {};
      source.url_params.api_key = apiKey;
    }
  }
}

export function initializeApiKey({scene, apiKey = getApiKeyFromUrl()}) {
  const listener = {
    load: message => injectApiKey(message.config, apiKey),
    update: message => injectApiKey(message.config, apiKey)
  };
  scene.subscribe(listener);

  return function destroyApiKey() {
    scene.unsubscribe(listener);
  };
}

function getApiKeyFromUrl() {
  return typeof URLSearchParams === 'function'
    ? new URLSearchParams(window.location.search).get('api_key') || ''
    : '';
}
