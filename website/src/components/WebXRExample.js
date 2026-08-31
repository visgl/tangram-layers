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

export default function WebXRExample() {
  const exampleBaseUrl = useBaseUrl('/examples/webxr/');
  const rendererUrl = useBaseUrl('/modules/tangram-renderer/dist/index.js');
  const [errorMessage, setErrorMessage] = useState(null);
  const appendedElements = useRef([]);

  useEffect(() => {
    let cancelled = false;
    document.body.classList.add('tangram-webxr-embedded');
    const stylesheetElement = appendStylesheet(`${exampleBaseUrl}main.css`);
    appendedElements.current.push(stylesheetElement);

    const importMapElement = document.createElement('script');
    importMapElement.type = 'importmap';
    importMapElement.textContent = JSON.stringify({
      imports: {
        '@luma.gl/core': 'https://esm.sh/@luma.gl/core@9.4.0-beta.3?bundle',
        '@luma.gl/engine':
          'https://esm.sh/@luma.gl/engine@9.4.0-beta.3?bundle&external=@luma.gl/core,@math.gl/core',
        '@luma.gl/experimental':
          'https://esm.sh/@luma.gl/experimental@9.4.0-beta.3?bundle&external=@luma.gl/core,@math.gl/core',
        '@luma.gl/webgl':
          'https://esm.sh/@luma.gl/webgl@9.4.0-beta.3?bundle&external=@luma.gl/core',
        '@luma.gl/webgpu':
          'https://esm.sh/@luma.gl/webgpu@9.4.0-beta.3?bundle&external=@luma.gl/core',
        '@math.gl/core': 'https://esm.sh/@math.gl/core@4.1.0?bundle',
        '@vis.gl/tangram-renderer': `${rendererUrl}?embedded=webxr`
      }
    });
    document.head.appendChild(importMapElement);
    appendedElements.current.push(importMapElement);

    appendScript(`${exampleBaseUrl}app.js?embedded=1`, 'module')
      .then((scriptElement) => {
        appendedElements.current.push(scriptElement);
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
      window.tangramWebXRExampleDestroy?.();
      appendedElements.current.forEach((element) => {
        element.remove();
      });
      appendedElements.current = [];
      document.body.classList.remove('tangram-webxr-embedded');
      delete window.tangramWebXRExampleDestroy;
    };
  }, [exampleBaseUrl, rendererUrl]);

  return (
    <div className="webxr-example-embed">
      <div id="webxr-container">
        <canvas id="webxr-canvas" />
        <div className="webxr-device-tabs" role="tablist" aria-label="Rendering device">
          <button type="button" data-webxr-device="webgl" role="tab">
            WebGL 2
          </button>
          <button type="button" data-webxr-device="webgpu" role="tab">
            WebGPU
          </button>
        </div>
        <aside className="webxr-panel">
          <h1>WebXR globe</h1>
          <p id="webxr-status" role="status">
            Preparing the renderer…
          </p>
          <div className="webxr-actions">
            <button id="webxr-enter" type="button" disabled>
              Enter VR
            </button>
            <button id="webxr-exit" type="button" hidden>
              Exit VR
            </button>
          </div>
          <p className="webxr-hint">
            luma.gl supplies the XR session, per-eye framebuffers and camera matrices. Tangram keeps
            one shared scene and tile cache.
          </p>
          <p className="webxr-hint">
            Use a WebXR headset or the Immersive Web Emulator extension to enter VR.
          </p>
        </aside>
        <p className="webxr-attribution">
          &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
        </p>
      </div>
      {errorMessage ? <p className="alert alert--danger">{errorMessage}</p> : null}
    </div>
  );
}
