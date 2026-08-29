// @ts-check

const path = require('path');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Tangram layers',
  tagline: 'Tangram rendering and deck.gl basemap integration',
  url: 'https://visgl.github.io',
  baseUrl: '/tangram-layers/',
  organizationName: 'visgl',
  projectName: 'tangram-layers',
  onBrokenLinks: 'warn',
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'robots',
        content: 'noindex, nofollow, noarchive'
      }
    }
  ],
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn'
    }
  },
  trailingSlash: false,

  presets: [
    [
      'classic',
      {
        docs: {
          path: path.resolve(__dirname, '../docs'),
          routeBasePath: 'docs',
          sidebarPath: path.resolve(__dirname, 'sidebars.js'),
          editUrl: 'https://github.com/visgl/tangram-layers/tree/master/'
        },
        blog: false,
        theme: {
          customCss: path.resolve(__dirname, 'src/css/custom.css')
        }
      }
    ]
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'examples',
        path: path.resolve(__dirname, 'src/examples'),
        routeBasePath: 'examples',
        sidebarPath: path.resolve(__dirname, 'src/examples-sidebar.js'),
        breadcrumbs: true,
        showLastUpdateTime: false,
        showLastUpdateAuthor: false
      }
    ]
  ],

  themeConfig: {
    navbar: {
      title: 'Tangram layers',
      items: [
        {to: '/docs', label: 'Docs', position: 'left'},
        {
          to: '/examples',
          label: 'Examples',
          position: 'left'
        },
        {
          href: 'https://github.com/visgl/tangram-layers',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Resources',
          items: [
            {label: 'Documentation', to: '/docs'},
            {label: 'Deck example', href: '/tangram-layers/examples/deck'}
          ]
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub', href: 'https://github.com/visgl/tangram-layers'},
            {label: 'Original Tangram repository', href: 'https://github.com/tangrams/tangram'},
            {label: 'Mapzen organization', href: 'https://github.com/mapzen'},
            {label: 'vis.gl', href: 'https://vis.gl/'}
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Tangram contributors`
    }
  }
};

module.exports = config;
