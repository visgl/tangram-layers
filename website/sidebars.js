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
        {
          type: 'category',
          label: '@vis.gl/tangram-renderer',
          items: [
            {
              type: 'doc',
              id: 'api-reference/tangram-renderer',
              label: 'Package overview'
            },
            {type: 'doc', id: 'api-reference/renderer', label: 'Renderer API'},
            {type: 'doc', id: 'api-reference/styling', label: 'Styling reference'}
          ]
        },
        {
          type: 'category',
          label: '@vis.gl/tangram-layers',
          items: [
            {
              type: 'doc',
              id: 'api-reference/tangram-layers',
              label: 'Package overview'
            },
            {type: 'doc', id: 'api-reference/tangram-layer', label: 'TangramLayer API'}
          ]
        }
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
