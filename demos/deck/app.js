import Tangram from '../../dist/tangram.debug.mjs?bridge=webgpu-basemap-state-12';
import createTangramLayerClass from './tangram-layer.js?bridge=std140-fix';
import {webgpuAdapter} from 'https://esm.sh/@luma.gl/webgpu@9.4.0-alpha.1?bundle&deps=@luma.gl/core@9.4.0-alpha.1';

const { Deck, Layer, PathLayer, ScatterplotLayer } = window.deck;
const searchParams = new URLSearchParams(window.location.search);
const requestedBackend = searchParams.get('device');
const deviceType = requestedBackend || (navigator.gpu ? 'webgpu' : 'webgl');
const useWebGPU = deviceType === 'webgpu';
const apiKey = searchParams.get('api_key');
const TangramLayer = createTangramLayerClass({
    Layer,
    Renderer: Tangram.debug.Renderer
});

const BASEMAPS = {
    streetsVector: {
        label: 'CARTO Streets vector tiles',
        scene: createVectorScene(),
        deviceTypes: ['webgl']
    },
    positronRaster: {
        label: 'CARTO Positron raster tiles',
        scene: createRasterScene('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'),
        deviceTypes: ['webgl', 'webgpu']
    },
    tron: {
        label: 'Tangram TRON 2.0 vector style',
        scene: createTronScene(apiKey),
        deviceTypes: ['webgl'],
        requiresApiKey: true,
        sourceUrl: 'https://github.com/tangrams/tron-style'
    }
};

const initialViewState = {
    longitude: -74.009764,
    latitude: 40.705319,
    zoom: 15,
    bearing: -20,
    pitch: 35
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
const deviceSelect = document.getElementById('device-type');
const cartoAttribution = document.getElementById('carto-attribution');
const nextzenAttribution = document.getElementById('nextzen-attribution');
const tronSourceLink = document.getElementById('tron-source-link');
deviceSelect.value = deviceType;
const defaultBasemapId = useWebGPU ? 'positronRaster' : 'streetsVector';
const requestedBasemapId = searchParams.get('basemap');
const initialBasemapId = requestedBasemapId && BASEMAPS[requestedBasemapId] &&
    BASEMAPS[requestedBasemapId].deviceTypes.includes(deviceType) ?
    requestedBasemapId : defaultBasemapId;
basemapSelect.value = initialBasemapId;
let basemapVisible = true;
let basemapId = initialBasemapId;
let lastError = null;

function setStatus(message, type = '') {
    if (type === 'error') {
        lastError = message;
    }
    else if (lastError) {
        return;
    }
    statusElement.textContent = message;
    statusElement.dataset.type = type;
}

function createLayers() {
    const basemap = BASEMAPS[basemapId];
    const layers = [];
    if (!basemap.requiresApiKey || apiKey) {
        layers.push(new TangramLayer({
            id: 'tangram-basemap',
            scene: basemap.scene,
            apiKey,
            visible: basemapVisible,
            onSceneLoad: () => setStatus(`${basemap.label} loaded through Tangram`, 'success'),
            onSceneError: error => setStatus(error.message, 'error')
        }));
    }
    layers.push(
        new PathLayer({
            id: 'alignment-path',
            data: [{ path: bridgePath }],
            getPath: object => object.path,
            getColor: () => [255, 96, 32, 220],
            getWidth: () => 6,
            widthUnits: 'pixels'
        }),
        new ScatterplotLayer({
            id: 'alignment-landmarks',
            data: landmarks,
            getPosition: object => object.coordinates,
            getRadius: () => 35,
            getFillColor: () => [30, 144, 255, 220],
            getLineColor: () => [255, 255, 255, 255],
            lineWidthMinPixels: 2,
            stroked: true,
            pickable: true
        }));
    return layers;
}

function updateBasemapPresentation() {
    const basemap = BASEMAPS[basemapId];
    const isTron = basemapId === 'tron';
    cartoAttribution.hidden = isTron;
    nextzenAttribution.hidden = !isTron;
    tronSourceLink.hidden = !isTron;

    lastError = null;
    if (basemap.requiresApiKey && !apiKey) {
        setStatus('TRON 2.0 uses Nextzen vector tiles. Add ?api_key=YOUR_KEY to the URL.', 'error');
    }
    else {
        setStatus(`Loading ${basemap.label} through Tangram on ${deviceType}…`);
    }
}

let deckInstance;
try {
    deckInstance = new Deck({
        parent: document.getElementById('deck-container'),
        deviceProps: useWebGPU ? {
            type: 'webgpu',
            adapters: [webgpuAdapter]
        } : { type: 'webgl' },
        initialViewState,
        controller: {
            dragRotate: true,
            touchRotate: true,
            maxPitch: 50
        },
        layers: createLayers(),
        getTooltip: ({ object }) => object && object.name,
        onError: error => {
            setStatus(error.message, 'error');
            return true;
        }
    });
}
catch (error) {
    setStatus(error.message, 'error');
    throw error;
}

updateBasemapPresentation();

deviceSelect.addEventListener('change', event => {
    const url = new URL(window.location.href);
    url.searchParams.set('device', event.target.value);
    if (!BASEMAPS[basemapId].deviceTypes.includes(event.target.value)) {
        url.searchParams.delete('basemap');
    }
    window.location.assign(url);
});

visibilityInput.addEventListener('change', event => {
    basemapVisible = event.target.checked;
    deckInstance.setProps({ layers: createLayers() });
});

basemapSelect.addEventListener('change', event => {
    const selectedBasemapId = event.target.value;
    const selectedBasemap = BASEMAPS[selectedBasemapId];
    if (!selectedBasemap.deviceTypes.includes(deviceType)) {
        const url = new URL(window.location.href);
        url.searchParams.set('device', selectedBasemap.deviceTypes[0]);
        url.searchParams.set('basemap', selectedBasemapId);
        window.location.assign(url);
        return;
    }

    basemapId = selectedBasemapId;
    const url = new URL(window.location.href);
    url.searchParams.set('basemap', basemapId);
    window.history.replaceState(null, '', url);
    updateBasemapPresentation();
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
                        order: function () {
                            var classOrder = {
                                path: 0,
                                track: 1,
                                service: 2,
                                minor: 3,
                                tertiary: 4,
                                secondary: 5,
                                primary: 6,
                                trunk: 7,
                                motorway: 8
                            };
                            var layer = parseInt(feature.layer, 10) || 0;
                            if (layer === 0 && feature.brunnel === 'bridge') {
                                layer = 1;
                            }
                            else if (layer === 0 && feature.brunnel === 'tunnel') {
                                layer = -1;
                            }
                            layer = Math.max(-5, Math.min(5, layer));
                            return 128 + layer * 16 + (classOrder[feature.class] || 0);
                        },
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

function createTronScene(runtimeApiKey) {
    return {
        import: ['https://www.nextzen.org/carto/tron-style/6/tron-style.zip'],
        global: {
            sdk_api_key: runtimeApiKey || '',
            sdk_animated: true
        }
    };
}
