import { assert } from 'chai';
import HostFrame from '../src/scene/host_frame';

const IDENTITY_MATRIX = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

function createCamera(offset = 0) {
    const view = IDENTITY_MATRIX.slice();
    view[12] = offset;
    return {
        view,
        projection: IDENTITY_MATRIX,
        position: [offset, 0, 0]
    };
}

describe('HostFrame', function () {
    it('normalizes the original renderer frame shape', function () {
        const frame = HostFrame.from({
            viewport: { width: 800, height: 600 },
            view: { longitude: -74, latitude: 40.7, zoom: 16 },
            camera: createCamera(),
            tileBuffer: 2
        });

        assert.instanceOf(frame, HostFrame);
        assert.deepEqual(frame.viewport, { x: 0, y: 0, width: 800, height: 600 });
        assert.deepEqual(frame.geographicAnchor, {
            longitude: -74,
            latitude: 40.7,
            altitude: 0,
            zoom: 16
        });
        assert.strictEqual(frame.activeRenderViewId, 'default');
        assert.strictEqual(frame.getRenderView().id, 'default');
        assert.strictEqual(frame.tileBuffer, 2);
    });

    it('stores multiple camera views over shared geographic state', function () {
        const frame = new HostFrame({
            viewport: { width: 1600, height: 600 },
            geographicAnchor: { longitude: -74, latitude: 40.7, altitude: 10, zoom: 16 },
            renderViews: [
                {
                    id: 'left-eye',
                    viewport: { x: 0, y: 0, width: 800, height: 600 },
                    camera: createCamera(-0.03)
                },
                {
                    id: 'right-eye',
                    viewport: { x: 800, y: 0, width: 800, height: 600 },
                    camera: createCamera(0.03)
                }
            ],
            activeRenderViewId: 'left-eye'
        });

        assert.lengthOf(frame.renderViews, 2);
        assert.strictEqual(frame.getRenderView('right-eye').viewport.x, 800);
        assert.closeTo(frame.getRenderView('left-eye').camera.position[0], -0.03, 1e-10);
        assert.closeTo(frame.getRenderView('right-eye').camera.position[0], 0.03, 1e-10);
    });

    it('rejects incomplete and ambiguous frame state', function () {
        assert.throws(() => new HostFrame(), /viewport/);
        assert.throws(() => new HostFrame({
            viewport: { width: 800, height: 600 },
            geographicAnchor: { longitude: -74, latitude: 40.7, zoom: 16 },
            renderViews: []
        }), /at least one render view/);
        assert.throws(() => new HostFrame({
            viewport: { width: 800, height: 600 },
            geographicAnchor: { longitude: -74, latitude: 40.7, zoom: 16 },
            renderViews: [
                { id: 'eye', camera: createCamera() },
                { id: 'eye', camera: createCamera() }
            ]
        }), /duplicated/);
    });
});
