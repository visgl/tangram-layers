module.exports = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Developer guide',
      items: [
        'get-started/getting-started',
        'developer-guide/architecture',
        'developer-guide/development',
        'developer-guide/bundling',
        'developer-guide/legacy-concepts'
      ]
    },
    {
      type: 'category',
      label: 'Contributor guide',
      items: ['contributor-guide/monorepo', 'contributor-guide/release']
    },
    {
      type: 'category',
      label: 'API reference',
      items: [
        'api-reference/tangram-renderer',
        'api-reference/styling',
        'api-reference/renderer',
        'api-reference/tangram-layer',
        'api-reference/tangram-layers'
      ]
    },
    {
      type: 'category',
      label: 'Project information',
      items: ['resources', 'upgrade-guide', 'whats-new']
    }
  ],
  examplesSidebar: [
    {
      type: 'doc',
      id: 'examples/index',
      label: 'All Tangram examples'
    },
    {
      type: 'doc',
      id: 'examples/deck',
      label: 'Deck + TangramLayer'
    },
    {
      type: 'doc',
      id: 'examples/classic',
      label: 'Classic playground'
    }
  ]
};
