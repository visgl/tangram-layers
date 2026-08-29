import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useEffect} from 'react';

/**
 * Compatibility entry point for links shared by the original playground.
 *
 * The integrated playground lives under the examples plugin so it can use the
 * examples sidebar. Keep this short alias working while preserving any scene
 * query and camera hash in links copied from the old demo.
 */
export default function ClassicAlias() {
  const targetUrl = useBaseUrl('/examples/classic');

  useEffect(() => {
    window.location.replace(`${targetUrl}${window.location.search}${window.location.hash}`);
  }, [targetUrl]);

  return (
    <Layout title="Classic Tangram playground">
      <main className="container margin-vert--lg">
        <p>
          Opening the integrated playground…{' '}
          <a href={targetUrl}>Continue to the Classic Tangram playground</a>
        </p>
      </main>
    </Layout>
  );
}
