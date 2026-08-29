import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

const EXAMPLE_LINKS = [
  {label: 'Deck + TangramLayer', path: '/examples/deck'},
  {label: 'Classic playground', path: '/examples/classic'},
  {label: 'Example gallery', path: '/docs/examples'}
];

export default function ExamplePage({title, description, children}) {
  const siteRootUrl = useBaseUrl('/');

  return (
    <Layout title={title} description={description}>
      <div className="container example-page">
        <div className="row">
          <aside className="col col--3 example-page__sidebar">
            <h2>Examples</h2>
            <nav aria-label="Examples">
              <ul>
                {EXAMPLE_LINKS.map((example) => (
                  <li key={example.path}>
                    <Link to={`${siteRootUrl}${example.path.replace(/^\//, '')}`}>
                      {example.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <main className="col col--9 example-page__content">{children}</main>
        </div>
      </div>
    </Layout>
  );
}
