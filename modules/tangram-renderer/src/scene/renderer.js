// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import Scene from './scene';
import HostFrame from './host_frame';
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
            cameraMode: 'external'
        }));
        this.host_frame = null;
        this.active_render_view_id = null;
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
    setFrame(frame, { renderViewId } = {}) {
        const host_frame = HostFrame.from(frame);
        const render_view = host_frame.getRenderView(renderViewId);
        const viewport = render_view.viewport;
        const anchor = host_frame.geographicAnchor;

        this.host_frame = host_frame;
        this.active_render_view_id = render_view.id;
        if (this.scene.view.size.css.width !== viewport.width ||
            this.scene.view.size.css.height !== viewport.height) {
            this.scene.resizeMap(viewport.width, viewport.height);
        }
        this.scene.view.setView({
            lng: anchor.longitude,
            lat: anchor.latitude,
            zoom: anchor.zoom
        });
        this.scene.setCameraMatrices(render_view.camera);
        this.scene.view.buffer = host_frame.tileBuffer;
        return host_frame;
    }

    /**
     * Updates and draws Tangram into a host-owned render pass.
     */
    render({ frame, renderPass = null, renderViewId, force = false } = {}) {
        if (frame) {
            this.setFrame(frame, { renderViewId });
        }
        else if (renderViewId) {
            if (!this.host_frame) {
                throw new Error('Renderer requires a HostFrame before selecting a render view');
            }
            this.setFrame(this.host_frame, { renderViewId });
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
