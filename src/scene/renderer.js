import Scene from './scene';
import LumaDeviceRenderer from '../gpu/luma_device_renderer';

/**
 * Embeddable Tangram renderer driven by a host-provided frame.
 *
 * Unlike the standalone Scene path, Renderer does not create an animation loop
 * or derive camera matrices. The host owns frame scheduling and supplies an
 * active render pass together with geographic view and camera state.
 */
export default class Renderer {

    constructor(config, options = {}) {
        this.device_renderer = options.device ? new LumaDeviceRenderer(options.device) : null;
        const device_options = this.device_renderer ? this.device_renderer.getSceneOptions() : {};
        this.scene = Scene.create(config, Object.assign({}, options, device_options, {
            disableRenderLoop: true,
            externalCamera: true
        }));
    }

    static create(config, options = {}) {
        return new Renderer(config, options);
    }

    subscribe(listeners) {
        return this.scene.subscribe(listeners);
    }

    load(config, options = {}) {
        return this.scene.load(config, options);
    }

    /**
     * Applies host-owned viewport, geographic, and camera state.
     */
    setFrame({ viewport, view, camera, tileBuffer = 0 } = {}) {
        if (viewport &&
            (this.scene.view.size.css.width !== viewport.width ||
             this.scene.view.size.css.height !== viewport.height)) {
            this.scene.resizeMap(viewport.width, viewport.height);
        }
        if (view) {
            this.scene.view.setView({
                lng: view.longitude,
                lat: view.latitude,
                zoom: view.zoom
            });
        }
        if (camera) {
            this.scene.setCameraMatrices(camera);
        }
        this.scene.view.buffer = tileBuffer;
    }

    /**
     * Updates and draws Tangram into a host-owned render pass.
     */
    render({ frame, renderPass = null, force = false } = {}) {
        if (frame) {
            this.setFrame(frame);
        }
        if (force) {
            this.scene.dirty = true;
        }
        const rendered = this.scene.updateScene({ renderPass });
        this.scene.processTasks();
        if (rendered && this.scene.config && this.scene.animated) {
            this.scene.requestRedraw();
        }
        return rendered;
    }

    destroy() {
        const result = this.scene.destroy();
        if (this.device_renderer) {
            this.device_renderer.destroy();
        }
        return result;
    }

}
