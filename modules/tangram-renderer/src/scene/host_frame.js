const DEFAULT_RENDER_VIEW_ID = 'default';

/**
 * Host-owned state for one Tangram frame.
 *
 * Geographic state and tile selection are shared by every render view. Each
 * render view supplies its own viewport and camera matrices, allowing a host to
 * draw the same loaded scene into multiple eyes without duplicating scene or
 * tile state.
 */
export default class HostFrame {

    /**
     * @param {object} options Host frame options.
     * @param {{width: number, height: number}} options.viewport Full render-target size.
     * @param {{longitude: number, latitude: number, altitude?: number, zoom: number}} options.geographicAnchor Shared geographic anchor and LOD zoom.
     * @param {Array<object>} options.renderViews Per-view viewport and camera state.
     * @param {string} [options.activeRenderViewId] Default render view.
     * @param {number} [options.tileBuffer=0] Extra Web Mercator tile buffer.
     */
    constructor({
        viewport,
        geographicAnchor,
        renderViews,
        activeRenderViewId,
        tileBuffer = 0
    } = {}) {
        this.viewport = normalizeViewport(viewport, 'HostFrame viewport');
        this.geographicAnchor = normalizeGeographicAnchor(geographicAnchor);
        this.renderViews = normalizeRenderViews(renderViews, this.viewport);
        this.tileBuffer = normalizeTileBuffer(tileBuffer);
        this.activeRenderViewId = activeRenderViewId || this.renderViews[0].id;
        this.getRenderView(this.activeRenderViewId);
    }

    /**
     * Normalizes either a HostFrame or the original `{viewport, view, camera}`
     * frame shape.
     *
     * @param {HostFrame|object} frame Host frame or legacy frame object.
     * @returns {HostFrame} Normalized host frame.
     */
    static from(frame) {
        if (frame instanceof HostFrame) {
            return frame;
        }
        if (frame && (frame.renderViews || frame.geographicAnchor)) {
            return new HostFrame(frame);
        }
        return HostFrame.fromLegacy(frame);
    }

    /**
     * Converts the original renderer frame shape into a HostFrame.
     *
     * @param {object} frame Legacy frame object.
     * @returns {HostFrame} Normalized host frame.
     */
    static fromLegacy({viewport, view, camera, tileBuffer = 0} = {}) {
        return new HostFrame({
            viewport,
            geographicAnchor: view && {
                longitude: view.longitude,
                latitude: view.latitude,
                altitude: view.altitude || 0,
                zoom: view.zoom
            },
            renderViews: [{
                id: DEFAULT_RENDER_VIEW_ID,
                viewport,
                camera
            }],
            activeRenderViewId: DEFAULT_RENDER_VIEW_ID,
            tileBuffer
        });
    }

    /**
     * Returns a render view by id.
     *
     * @param {string} [renderViewId] View id, or the active view when omitted.
     * @returns {object} Normalized render view.
     */
    getRenderView(renderViewId = this.activeRenderViewId) {
        const renderView = this.renderViews.find(candidate => candidate.id === renderViewId);
        if (!renderView) {
            throw new Error(`HostFrame render view '${renderViewId}' was not found`);
        }
        return renderView;
    }
}

function normalizeRenderViews(renderViews, fallbackViewport) {
    if (!Array.isArray(renderViews) || renderViews.length === 0) {
        throw new Error('HostFrame requires at least one render view');
    }

    const ids = new Set();
    return renderViews.map((renderView, index) => {
        if (!renderView || typeof renderView !== 'object') {
            throw new Error(`HostFrame render view ${index} is invalid`);
        }
        const id = renderView.id || (index === 0 ? DEFAULT_RENDER_VIEW_ID : `view-${index}`);
        if (ids.has(id)) {
            throw new Error(`HostFrame render view id '${id}' is duplicated`);
        }
        ids.add(id);
        return {
            id,
            viewport: normalizeViewport(renderView.viewport || fallbackViewport, `HostFrame render view '${id}' viewport`),
            camera: normalizeCamera(renderView.camera, id)
        };
    });
}

function normalizeViewport(viewport, label) {
    if (!viewport || !isPositiveNumber(viewport.width) || !isPositiveNumber(viewport.height)) {
        throw new Error(`${label} requires positive width and height`);
    }
    return {
        x: normalizeFiniteNumber(viewport.x, 0),
        y: normalizeFiniteNumber(viewport.y, 0),
        width: viewport.width,
        height: viewport.height
    };
}

function normalizeGeographicAnchor(anchor) {
    if (!anchor || !Number.isFinite(anchor.longitude) || !Number.isFinite(anchor.latitude) ||
        !Number.isFinite(anchor.zoom)) {
        throw new Error('HostFrame geographic anchor requires finite longitude, latitude, and zoom');
    }
    return {
        longitude: anchor.longitude,
        latitude: anchor.latitude,
        altitude: normalizeFiniteNumber(anchor.altitude, 0),
        zoom: anchor.zoom
    };
}

function normalizeCamera(camera, renderViewId) {
    if (!camera || !isMatrix(camera.view) || !isMatrix(camera.projection) ||
        !camera.position || camera.position.length !== 3) {
        throw new Error(`HostFrame render view '${renderViewId}' requires camera matrices and position`);
    }
    return {
        view: new Float64Array(camera.view),
        projection: new Float32Array(camera.projection),
        position: Array.from(camera.position)
    };
}

function normalizeTileBuffer(tileBuffer) {
    if (!Number.isFinite(tileBuffer) || tileBuffer < 0) {
        throw new Error('HostFrame tileBuffer must be a finite non-negative number');
    }
    return tileBuffer;
}

function isMatrix(matrix) {
    return matrix && matrix.length === 16;
}

function isPositiveNumber(value) {
    return Number.isFinite(value) && value > 0;
}

function normalizeFiniteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}
