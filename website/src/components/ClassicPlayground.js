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

let classicPlaygroundMountId = 0;

export default function ClassicPlayground() {
  const classicBaseUrl = useBaseUrl('/examples/classic/');
  const rendererUrl = useBaseUrl('/modules/tangram-renderer/dist/tangram.debug.mjs');
  const [errorMessage, setErrorMessage] = useState(null);
  const scriptElements = useRef([]);
  const stylesheetElements = useRef([]);

  useEffect(() => {
    let cancelled = false;
    window.tangramClassicCancelled = false;
    document.body.classList.add('tangram-classic-embedded');
    stylesheetElements.current = [
      appendStylesheet(`${classicBaseUrl}css/main.css`),
      appendStylesheet('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.2.0/leaflet.css'),
      appendStylesheet(
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet-geocoder-mapzen/1.9.4/leaflet-geocoder-mapzen.css'
      )
    ];
    window.tangramClassicEmbedded = true;

    const scripts = [
      [`https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.2.0/leaflet.js`, 'text/javascript'],
      [
        `https://cdnjs.cloudflare.com/ajax/libs/leaflet-geocoder-mapzen/1.9.4/leaflet-geocoder-mapzen.js`,
        'text/javascript'
      ],
      [`${classicBaseUrl}lib/FileSaver.js`, 'text/javascript'],
      [`${classicBaseUrl}lib/keymaster.js`, 'text/javascript'],
      [rendererUrl, 'module'],
      [`${classicBaseUrl}main.js?embedded=1`, 'text/javascript'],
      [`${classicBaseUrl}app/url.js?embedded=1`, 'text/javascript'],
      [`${classicBaseUrl}app/key.js?embedded=1`, 'text/javascript'],
      [
        `${classicBaseUrl}app/settings-panel.js?embedded=1&mount=${++classicPlaygroundMountId}`,
        'module'
      ]
    ];

    (async () => {
      try {
        for (const [url, type] of scripts) {
          const scriptElement = await appendScript(url, type);
          scriptElements.current.push(scriptElement);
          if (cancelled) {
            scriptElement.remove();
            return;
          }
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.message);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.tangramClassicCancelled = true;
      window.tangramClassicSettingsCleanup?.();
      window.tangramClassicDestroy?.();
      stylesheetElements.current.forEach((linkElement) => {
        linkElement.remove();
      });
      scriptElements.current.forEach((scriptElement) => {
        scriptElement.remove();
      });
      stylesheetElements.current = [];
      scriptElements.current = [];
      document.body.classList.remove('tangram-classic-embedded');
      delete window.tangramClassicEmbedded;
      delete window.tangramClassicCancelled;
      delete window.tangramClassicDestroy;
      delete window.tangramClassicSettingsCleanup;
    };
  }, [classicBaseUrl, rendererUrl]);

  return (
    <div className="classic-playground-embed">
      <div id="classic-playground-frame">
        <div id="map" />
      </div>
      {errorMessage ? <p className="alert alert--danger">{errorMessage}</p> : null}
    </div>
  );
}
