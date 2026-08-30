// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  return (
    <Layout title="Tangram layers" description="Tangram rendering and deck.gl basemap integration">
      <header className="hero hero--primary">
        <div className="container">
          <h1 className="hero__title">Tangram layers</h1>
          <p className="hero__subtitle">
            A luma.gl-backed Tangram renderer and an experimental deck.gl basemap layer.
          </p>
          <div>
            <Link className="button button--secondary button--lg" to="/docs">
              Read the docs
            </Link>{' '}
            <a className="button button--outline button--lg" href="/tangram-layers/examples/deck">
              Open the live example
            </a>
          </div>
        </div>
      </header>
      <main>
        <section className="container margin-vert--lg">
          <div className="row">
            <div className="col col--6">
              <h2>Two focused packages</h2>
              <ul>
                <li>deck.gl basemaps with wicked styling</li>
                <li>a luma.gl powered basemap renderer</li>
              </ul>
              <p>
                The renderer owns Tangram scenes and GPU resources. The layer package adapts it to
                deck.gl’s device, viewport, and render-pass lifecycle.
              </p>
            </div>
            <div className="col col--6">
              <h2>One runnable integration</h2>
              <p>
                Explore vector basemaps, the animated TRON style, and deck.gl overlays on WebGL or
                WebGPU.
              </p>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
