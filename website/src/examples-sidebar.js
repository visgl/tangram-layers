const sidebars = {
  examplesSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'Examples overview'
    },
    {
      type: 'category',
      label: 'Integrated examples',
      items: [
        {type: 'doc', id: 'deck', label: 'Deck + TangramLayer'},
        {type: 'doc', id: 'classic', label: 'Classic playground'}
      ]
    }
  ]
};

module.exports = sidebars;
