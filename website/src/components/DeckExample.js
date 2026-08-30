// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {useEffect, useRef, useState} from 'react';
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

let deckExampleMountId = 0;

export default function DeckExample() {
  const deckExampleBaseUrl = useBaseUrl('/examples/deck/');
  const tangramLayersUrl = useBaseUrl('/modules/tangram-layers/dist/index.js');
  const tangramRendererUrl = useBaseUrl('/modules/tangram-renderer/dist/index.js');
  const [errorMessage, setErrorMessage] = useState(null);
  const scriptElements = useRef([]);
  const stylesheetElement = useRef(null);

  useEffect(() => {
    let cancelled = false;
    document.body.classList.add('tangram-deck-embedded');
    window.tangramExampleBaseUrl = new URL(deckExampleBaseUrl, window.location.origin).href;
    stylesheetElement.current = appendStylesheet(`${deckExampleBaseUrl}main.css`);

    const importMapElement = document.createElement('script');
    importMapElement.type = 'importmap';
    importMapElement.textContent = JSON.stringify({
      imports: {
        '@deck.gl/core': 'https://esm.sh/deck.gl@9.4.0-alpha.2?bundle&external=@luma.gl/core',
        '@deck.gl/layers': 'https://esm.sh/deck.gl@9.4.0-alpha.2?bundle&external=@luma.gl/core',
        '@luma.gl/core': 'https://esm.sh/@luma.gl/core@9.4.0-alpha.2?bundle',
        '@vis.gl/tangram-layers': `${tangramLayersUrl}?embedded=1`,
        '@vis.gl/tangram-renderer': `${tangramRendererUrl}?embedded=1`
      }
    });
    document.head.appendChild(importMapElement);
    scriptElements.current.push(importMapElement);

    appendScript(`${deckExampleBaseUrl}app.js?embedded=1&mount=${++deckExampleMountId}`, 'module')
      .then((scriptElement) => {
        scriptElements.current.push(scriptElement);
        if (cancelled) {
          scriptElement.remove();
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      cancelled = true;
      window.tangramDeckExampleDestroy?.();
      stylesheetElement.current?.remove();
      scriptElements.current.forEach((scriptElement) => {
        scriptElement.remove();
      });
      scriptElements.current = [];
      document.body.classList.remove('tangram-deck-embedded');
      delete window.tangramExampleBaseUrl;
      delete window.tangramDeckExampleDestroy;
    };
  }, [deckExampleBaseUrl, tangramLayersUrl, tangramRendererUrl]);

  return (
    <div className="deck-example-embed">
      <div id="deck-container">
        <aside id="controls">
          <h1>TangramLayer bridge</h1>
          <p id="status" role="status" />
          <label className="control">
            <span>Device</span>
            <select id="device-type" defaultValue="webgpu">
              <option value="webgpu">WebGPU</option>
              <option value="webgl">WebGL</option>
            </select>
          </label>
          <label className="control">
            <span>Basemap</span>
            <select id="basemap-style" defaultValue="tron">
              <option value="streetsVector">Streets (vector)</option>
              <option value="positronRaster">Positron (raster)</option>
              <option value="tron">TRON 2.0 (vector, no key)</option>
              <option value="tronNextzen">Original TRON 2.0 on Nextzen</option>
            </select>
          </label>
          <label className="control">
            <span>deck.gl view</span>
            <select id="view-type" defaultValue="mapPerspective">
              <option value="mapFlat">MapView — flat</option>
              <option value="mapPerspective">MapView — perspective</option>
              <option value="globe">GlobeView — renderer adapter needed</option>
              <option value="firstPerson">FirstPersonView — renderer adapter needed</option>
            </select>
          </label>
          <label className="control checkbox-control">
            <input id="basemap-visible" type="checkbox" defaultChecked />
            Show TangramBasemapLayer
          </label>
          <p className="hint">
            Use the device tabs above or the device selector to compare WebGL and WebGPU.
          </p>
          <form id="nextzen-key-form" hidden>
            <label className="control" htmlFor="nextzen-api-key">
              <span>Existing Nextzen API key</span>
            </label>
            <div className="key-input-row">
              <input
                id="nextzen-api-key"
                name="nextzen-api-key"
                type="password"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit">Load</button>
            </div>
            <p className="hint">Kept only in this browser tab; never written to source.</p>
          </form>
          <p className="source-link">
            <a
              href="https://github.com/visgl/tangram-layers/blob/master/examples/deck/app.js"
              target="_blank"
              rel="noopener noreferrer"
            >
              View TangramLayer demo source
            </a>
          </p>
          <p id="tron-source-link" className="source-link" hidden>
            Style source: <a href="https://github.com/tangrams/tron-style">tangrams/tron-style</a>
          </p>
        </aside>
        <p id="attribution">
          &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
          <span id="carto-attribution"> &copy; Basemap data providers</span>
          <span id="nextzen-attribution" hidden>
            {' '}
            &copy; Nextzen
          </span>
        </p>
      </div>
      {errorMessage ? <p className="alert alert--danger">{errorMessage}</p> : null}
    </div>
  );
}
