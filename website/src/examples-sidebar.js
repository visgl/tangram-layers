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
      items: [{type: 'doc', id: 'deck', label: 'Deck + TangramLayer'}]
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
