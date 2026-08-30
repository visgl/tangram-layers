// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import TronHeroBackground from '../components/TronHeroBackground';

export default function Home() {
  return (
    <Layout title="tangram.gl" description="Tangram rendering and deck.gl basemap integration">
      <header className="hero hero--primary">
        <TronHeroBackground />
        <div className="container">
          <h1 className="hero__title">tangram.gl</h1>
          <p className="hero__subtitle">
            <a href="https://github.com/tangrams/tangram">Tangram</a> basemaps, reincarnated in the{' '}
            <a href="https://www.openvisualization.org/projects">vis.gl</a> pantheon
          </p>
          <div>
            <Link
              className="button button--secondary button--lg"
              to="/docs/get-started/getting-started"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className="container margin-vert--lg">
          <p className="homepage-introduction">
            A luma.gl-backed Tangram renderer and an experimental deck.gl basemap layer.
          </p>
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
              <h2>Fully Modernized</h2>
              <p>
                Use vector basemaps, the animated TRON style, and deck.gl overlays on both WebGPU
                and WebGL 2.
              </p>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
