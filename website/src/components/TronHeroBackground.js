// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {useEffect, useRef} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

function appendStylesheet(url) {
  const linkElement = document.createElement('link');
  linkElement.rel = 'stylesheet';
  linkElement.href = url;
  document.head.appendChild(linkElement);
  return linkElement;
}

function appendScript(url, type = 'text/javascript') {
  return new Promise((resolve, reject) => {
    const scriptElement = document.createElement('script');
    scriptElement.src = url;
    scriptElement.type = type;
    scriptElement.onload = () => resolve(scriptElement);
    scriptElement.onerror = () => reject(new Error(`Unable to load ${url}`));
    document.body.appendChild(scriptElement);
  });
}

/**
 * Mounts the classic Tangram TRON scene as a non-interactive homepage
 * background. It deliberately uses Tangram directly, without a deck.gl
 * overlay, so the homepage showcases the renderer itself.
 */
export default function TronHeroBackground() {
  const classicBaseUrl = useBaseUrl('/examples/classic/');
  const mapElement = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const mapElementId = `tangram-home-tron-${Date.now()}`;
    if (!mapElement.current) {
      return undefined;
    }
    mapElement.current.id = mapElementId;

    const stylesheetElements = [
      appendStylesheet(`${classicBaseUrl}css/main.css`),
      appendStylesheet('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.2.0/leaflet.css')
    ];
    const scriptElements = [];
    window.tangramClassicBaseUrl = classicBaseUrl;
    window.tangramClassicScene = 'styles/local-tron.yaml';
    window.tangramClassicMapId = mapElementId;

    (async () => {
      try {
        for (const [url, type] of [
          ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.2.0/leaflet.js', 'text/javascript'],
          [`${classicBaseUrl}lib/keymaster.js`, 'text/javascript'],
          [`${classicBaseUrl}main.js?home=tron`, 'module']
        ]) {
          const scriptElement = await appendScript(url, type);
          scriptElements.push(scriptElement);
          if (cancelled) {
            scriptElement.remove();
            return;
          }
        }
      } catch (error) {
        if (!cancelled) {
          // The visual is progressive enhancement; keep the hero usable if
          // the remote Leaflet dependency is unavailable.
          console.warn(error);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.tangramClassicDestroy?.();
      stylesheetElements.forEach((linkElement) => {
        linkElement.remove();
      });
      scriptElements.forEach((scriptElement) => {
        scriptElement.remove();
      });
      delete window.tangramClassicBaseUrl;
      delete window.tangramClassicScene;
      delete window.tangramClassicMapId;
      delete window.tangramClassicDestroy;
      delete window.map;
      delete window.layer;
      delete window.scene;
    };
  }, [classicBaseUrl]);

  return <div ref={mapElement} className="tangram-home-live-map" aria-hidden="true" />;
}
