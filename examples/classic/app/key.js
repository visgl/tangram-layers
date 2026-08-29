(function(){
    var api_key = '';
    if ('URLSearchParams' in window) {
        api_key = new URLSearchParams(window.location.search).get('api_key') || '';
    }

    window.addEventListener('load', function () {
        // Inject a caller-provided API key on load or update. Never bundle a
        // shared key in the published playground.
        layer.scene.subscribe({
            load: function (msg) {
                injectAPIKey(msg.config);
            },
            update: function (msg) {
                injectAPIKey(msg.config);
            }
        });
    });

    function injectAPIKey(config) {
        if (!api_key || !config) {
            return;
        }

        config.global = config.global || {};
        if ('sdk_api_key' in config.global) {
            config.global.sdk_api_key = api_key;
        }
        if ('api_key' in config.global) {
            config.global.api_key = api_key;
        }

        for (var name in config.sources || {}) {
            var source = config.sources[name];
            if (typeof source.url === 'string' && source.url.indexOf('nextzen.org') > -1) {
                source.url_params = source.url_params || {};
                source.url_params.api_key = api_key;
            }
        }
    }
})();
