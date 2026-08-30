const sidebars = {
  examplesSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'Examples overview'
    },
    {
      type: 'category',
      label: 'TangramLayer examples',
      collapsed: false,
      items: [
        {type: 'doc', id: 'deck', label: 'MapView perspective'},
        {type: 'doc', id: 'deck-map-flat', label: 'MapView flat'},
        {type: 'doc', id: 'deck-globe', label: 'GlobeView'},
        {type: 'doc', id: 'deck-first-person', label: 'FirstPersonView'}
      ]
    },
    {
      type: 'category',
      label: 'Tangram renderer examples',
      collapsed: false,
      items: [{type: 'doc', id: 'classic', label: 'Classic playground'}]
    }
  ]
};

module.exports = sidebars;
