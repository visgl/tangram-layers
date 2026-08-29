module.exports = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Overview',
      items: [
        {type: 'doc', id: 'resources', label: 'Overview'},
        {type: 'doc', id: 'whats-new', label: "What's new"},
        {type: 'doc', id: 'upgrade-guide', label: 'Upgrade guide'}
      ]
    },
    {
      type: 'category',
      label: 'Developer guide',
      items: [
        'get-started/getting-started',
        'developer-guide/architecture',
        'developer-guide/bundling',
        {type: 'doc', id: 'developer-guide/legacy-concepts', label: 'Tangram concepts'}
      ]
    },
    {
      type: 'category',
      label: 'Contributor guide',
      items: [
        'contributor-guide/development',
        'contributor-guide/monorepo',
        'contributor-guide/release'
      ]
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
