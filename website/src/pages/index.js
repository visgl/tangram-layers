// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import TronHeroBackground from '../components/TronHeroBackground';

export default function Home() {
  return (
    <Layout title="tangram.gl" description="Tangram rendering and deck.gl basemap integration">
      <header className="hero hero--primary tron-map-effect">
        <TronHeroBackground />
        <div className="container tron-map-effect__content">
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
            </div>
            <div className="col col--6">
              <h2>Fully Modernized</h2>
              <p>Tangram basemaps, but now using modern TypeScript, WebGPU and WebGL 2.</p>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
