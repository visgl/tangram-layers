// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useEffect} from 'react';

/** Compatibility entry point for the original deck example URL. */
export default function DeckAlias() {
  const targetUrl = useBaseUrl('/examples/deck');

  useEffect(() => {
    window.location.replace(`${targetUrl}${window.location.search}${window.location.hash}`);
  }, [targetUrl]);

  return (
    <Layout title="Deck and TangramLayer example">
      <main className="container margin-vert--lg">
        <p>
          Opening the integrated deck example…{' '}
          <a href={targetUrl}>Continue to the Deck and TangramLayer example</a>
        </p>
      </main>
    </Layout>
  );
}
