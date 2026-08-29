(function(){
    var scene = window.scene;
    var scene_key = 'Simple';

    window.addEventListener('load', function () {
        // Add search control
        L.control.geocoder('ge-3d066b6b1c398181', {
            url: 'https://api.geocode.earth/v1',
            layers: 'coarse',
            expanded: true,
            markers: false,
            attribution: 'Geocoding by <a href="https://geocode.earth/" target="_blank">geocode.earth</a>'
        }).addTo(window.map);

        // Add GUI on scene load
        layer.scene.subscribe({
            load: function (msg) {
                addGUI();
            }
        });
    });

    var gui;
    function addGUI () {
        // Remove old GUI
        if (gui != null) {
            gui.destroy();
        }

        // Create GUI
        gui = new dat.GUI({ autoPlace: true });
        gui.domElement.parentNode.style.zIndex = 10000;
        window.gui = gui;

        setLanguage(gui, scene);
        setCamera(gui, scene);
        setScene(gui);
        setScreenshot(gui, scene);
        setMediaRecorder(gui, scene);
        setFeatureDebug(gui);
        setLayers(gui, scene);
    }

    function setScene(gui) {
        // NOTE: using previous version of Mapzen/Nextzen basemaps, until some issues are
        // resolved in current versions (syntax errors on shields, etc.)
        var scenes = {
            // Offline preview that does not require a tile service or API key
            'Local streets (offline)': 'styles/local-basemap.yaml',
            'TRON preview (offline)': 'styles/local-tron.yaml',
            // Open raster basemaps that do not require a tile-service API key
            'Light raster basemap': 'styles/open-light-raster.yaml',
            'Street map raster': 'styles/open-streets-raster.yaml',
            'Albers projection morph': 'styles/projection-morph.yaml',

            // Default style
            'Simple': 'scene.yaml',

            // Nextzen (nee Mapzen) basemaps
            'Bubble Wrap': 'styles/bubble-wrap.yaml',
            'Walkabout': 'styles/walkabout.yaml',
            'Refill': 'styles/refill.yaml',
            'Refill Blue Terrain': 'styles/refill-blue-terrain.yaml',
            'Tron': 'styles/tron.yaml',

            // Crosshatch style (texture/shader demos)
            'Crosshatch': 'styles/crosshatch.zip',
            'Crosshatch (local preview)': 'styles/crosshatch-preview.yaml',

            // Fragment shader example
            'Rainbow Buildings': 'styles/rainbow-buildings.yaml',

            // Vertex shader example
            'Pop-up Buildings': 'styles/popup-buildings.yaml'
        };

        Object.keys(scenes).forEach(function (s) { scenes[s] = JSON.stringify(scenes[s]); }); // need to stringify JSON for dat.gui :(

        scene_key = Object.keys(scenes).filter(function (s) { return scenes[s] === JSON.stringify(scene.config_source); })[0]; // find scene from sample list
        if (scene_key) {
            gui.scene = scenes[scene_key];
        }
        else {
            gui.scene = {};
        }

        gui.add(gui, 'scene', scenes).onChange(function(value) {
            scene_key = Object.keys(scenes).filter(function(s){ return scenes[s] === value })[0]; // find scene from sample list
            value = JSON.parse(value); // need to stringify JSON for dat.gui :(
            scene.load(value);
        });
    }

    function setLanguage(gui, scene){
        var langs = {
            '(default)': null,
            'English': 'en',
            'Russian': 'ru',
            'Japanese': 'ja',
            'German': 'de',
            'French': 'fr',
            'Arabic': 'ar',
            'Hindi': 'hi',
            'Spanish': 'es'
        };

        // only add if scene supports language
        if (scene.config.global.language !== undefined || scene.config.global.ux_language !== undefined) {
            gui.language = 'en';
            scene.config.global.language = gui.language;
            scene.config.global.ux_language = gui.language;
            gui.add(gui, 'language', langs).onChange(function(value) {
                scene.config.global.language = value;    // for bundled demos
                scene.config.global.ux_language = value; // for Nextzen basemaps
                scene.updateConfig();
            });
        }
    }

    function setCamera(gui, scene){
        // Only add if scene has all camera types
        var cameras = scene.config.cameras;
        if (cameras.perspective && cameras.isometric && cameras.flat) {
            var camera_types = {
                'Flat': 'flat',
                'Perspective': 'perspective',
                'Isometric': 'isometric'
            };

            gui.camera = scene.getActiveCamera();
            gui.add(gui, 'camera', camera_types).onChange(function(value) {
                scene.setActiveCamera(value);
            });
        }
    }

    function setScreenshot(gui, scene){
        // Take a screenshot and save to file
        gui.screenshot = function () {
            return scene.screenshot().then(function(screenshot) {
                // uses FileSaver.js: https://github.com/eligrey/FileSaver.js/
                saveAs(screenshot.blob, 'tangram-' + (+new Date()) + '.png');
            });
        };
        gui.add(gui, 'screenshot');
    }

    function setMediaRecorder(gui, scene){
        // Take a video capture and save to file
        if (typeof window.MediaRecorder == 'function') {
            gui.video = function () {
                if (!gui.video_capture) {
                    if (scene.startVideoCapture()) {
                        gui.video_capture = true;
                        gui.video_button.name('stop video');
                    }
                }
                else {
                    return scene.stopVideoCapture().then(function(video) {
                        gui.video_capture = false;
                        gui.video_button.name('capture video');
                        saveAs(video.blob, 'tangram-video-' + (+new Date()) + '.webm');
                    });
                }
            };
            gui.video_button = gui.add(gui, 'video');
            gui.video_button.name('capture video');
            gui.video_capture = false;
        }
    }

    function setLayers(gui, scene){
        var layer_gui = gui.addFolder('Layers');
        var layer_controls = {};
        var layers = scene.config.layers;

        for (var key in layers){
            setOnChange(key);
        }
        function setOnChange(key) {
            var layer = layers[key];
            if (!layer) {
                return;
            }

            layer_controls[key] = !(layer.enabled == false);
            layer_gui.add(layer_controls, key)
                .onChange(function(value) {
                    layer.enabled = value;
                    scene.updateConfig();
                });

        }
    }

    function setFeatureDebug(gui) {
        gui.debug = scene.introspection;
        gui.add(gui, 'debug').onChange(function(value) {
            scene.setIntrospection(value);
        });
    }
})();
