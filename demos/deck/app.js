import Tangram from '../../dist/tangram.debug.mjs?bridge=shared-context';
import createTangramLayerClass from './tangram-layer.js?bridge=shared-context';

const { Deck, Layer, PathLayer, ScatterplotLayer } = window.deck;
const TangramLayer = createTangramLayerClass({
    Layer,
    Scene: Tangram.debug.Scene
});

const CARTO_BASEMAPS = {
    streetsVector: {
        label: 'CARTO Streets vector tiles',
        scene: createVectorScene()
    },
    positronRaster: {
        label: 'CARTO Positron raster tiles',
        scene: createRasterScene('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png')
    }
};

const initialViewState = {
    longitude: -74.009764,
    latitude: 40.705319,
    zoom: 15,
    bearing: 0,
    pitch: 0
};

const landmarks = [
    { name: 'One World Trade Center', coordinates: [-74.013379, 40.712743] },
    { name: 'Brooklyn Bridge', coordinates: [-73.996864, 40.706086] }
];

const bridgePath = [
    [-74.013379, 40.712743],
    [-74.009764, 40.705319],
    [-73.996864, 40.706086]
];

const statusElement = document.getElementById('status');
const visibilityInput = document.getElementById('basemap-visible');
const basemapSelect = document.getElementById('basemap-style');
let basemapVisible = true;
let basemapId = basemapSelect.value;

function setStatus(message, type = '') {
    statusElement.textContent = message;
    statusElement.dataset.type = type;
}

function createLayers() {
    const basemap = CARTO_BASEMAPS[basemapId];
    return [
        new TangramLayer({
            id: 'tangram-basemap',
            scene: basemap.scene,
            visible: basemapVisible,
            onSceneLoad: () => setStatus(`${basemap.label} loaded through Tangram`, 'success'),
            onSceneError: error => setStatus(error.message, 'error')
        }),
        new PathLayer({
            id: 'alignment-path',
            data: [{ path: bridgePath }],
            getPath: object => object.path,
            getColor: [255, 96, 32, 220],
            getWidth: 6,
            widthUnits: 'pixels'
        }),
        new ScatterplotLayer({
            id: 'alignment-landmarks',
            data: landmarks,
            getPosition: object => object.coordinates,
            getRadius: 35,
            getFillColor: [30, 144, 255, 220],
            getLineColor: [255, 255, 255, 255],
            lineWidthMinPixels: 2,
            stroked: true,
            pickable: true
        })
    ];
}

const deckInstance = new Deck({
    parent: document.getElementById('deck-container'),
    initialViewState,
    controller: {
        dragRotate: false,
        touchRotate: false
    },
    layers: createLayers(),
    getTooltip: ({ object }) => object && object.name,
    onError: error => {
        setStatus(error.message, 'error');
        return true;
    }
});

setStatus(`Loading ${CARTO_BASEMAPS[basemapId].label} through Tangram…`);

visibilityInput.addEventListener('change', event => {
    basemapVisible = event.target.checked;
    deckInstance.setProps({ layers: createLayers() });
});

basemapSelect.addEventListener('change', event => {
    basemapId = event.target.value;
    setStatus(`Loading ${CARTO_BASEMAPS[basemapId].label} through Tangram…`);
    deckInstance.setProps({ layers: createLayers() });
});

function createRasterScene(url) {
    return {
        sources: {
            carto: {
                type: 'Raster',
                url,
                max_zoom: 20
            }
        },
        layers: {
            basemap: {
                data: { source: 'carto' },
                draw: {
                    raster: { order: 0 }
                }
            }
        }
    };
}

function createVectorScene() {
    return {
        scene: {
            background: { color: '#f5f3ef' }
        },
        fonts: {
            Montserrat: { url: '../fonts/montserrat.woff' }
        },
        sources: {
            carto: {
                type: 'MVT',
                url: 'https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
                tile_size: 512,
                max_zoom: 14
            }
        },
        layers: {
            landcover: {
                data: { source: 'carto', layer: 'landcover' },
                draw: {
                    polygons: { order: 1, color: '#e8eee5' }
                }
            },
            landuse: {
                data: { source: 'carto', layer: 'landuse' },
                draw: {
                    polygons: { order: 2, color: '#eeeae2' }
                }
            },
            parks: {
                data: { source: 'carto', layer: 'park' },
                draw: {
                    polygons: { order: 3, color: '#cfe5c8' }
                }
            },
            water: {
                data: { source: 'carto', layer: 'water' },
                draw: {
                    polygons: { order: 4, color: '#b9d9e7' }
                }
            },
            waterways: {
                data: { source: 'carto', layer: 'waterway' },
                draw: {
                    lines: { order: 5, color: '#a4cfdf', width: '1px' }
                }
            },
            buildings: {
                data: { source: 'carto', layer: 'building' },
                filter: { $zoom: { min: 14 } },
                draw: {
                    polygons: { order: 6, color: '#ded8d0' }
                }
            },
            roads: {
                data: { source: 'carto', layer: 'transportation' },
                draw: {
                    lines: {
                        order: 7,
                        color: '#ffffff',
                        width: [[8, '0.5px'], [12, '1px'], [16, '3px']],
                        outline: { color: '#d5d0c8', width: '1px' }
                    }
                },
                major: {
                    filter: { class: ['motorway', 'trunk', 'primary', 'secondary'] },
                    draw: {
                        lines: {
                            color: '#f5c879',
                            width: [[8, '1px'], [12, '2px'], [16, '7px']],
                            outline: { color: '#d4aa65', width: '1px' }
                        }
                    }
                }
            },
            places: {
                data: { source: 'carto', layer: 'place' },
                draw: {
                    text: {
                        order: 8,
                        text_source: 'name',
                        font: {
                            family: 'Montserrat',
                            size: [[6, '11px'], [12, '14px']],
                            fill: '#4b4b4b',
                            stroke: { color: '#f5f3ef', width: 3 }
                        }
                    }
                }
            }
        }
    };
}
