import { assert } from 'chai';
import Renderer from '../src/scene/renderer';

const IDENTITY_MATRIX = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

describe('Renderer', function () {
    it('constructs an externally driven scene and applies a host frame', function () {
        const renderer = Renderer.create({});
        const scene = renderer.scene;
        sinon.spy(scene, 'resizeMap');
        sinon.spy(scene.view, 'setView');
        sinon.spy(scene, 'setCameraMatrices');

        renderer.setFrame({
            viewport: { width: 800, height: 600 },
            view: { longitude: -74, latitude: 40.7, zoom: 16 },
            camera: {
                view: IDENTITY_MATRIX,
                projection: IDENTITY_MATRIX,
                position: [0, 0, 0]
            },
            tileBuffer: 2
        });

        assert.isFalse(scene.render_loop);
        assert.isTrue(scene.view.external_camera);
        assert.isTrue(scene.resizeMap.calledWith(800, 600));
        assert.isTrue(scene.view.setView.calledWith({ lng: -74, lat: 40.7, zoom: 16 }));
        assert.isTrue(scene.setCameraMatrices.calledOnce);
        assert.strictEqual(scene.view.buffer, 2);
    });

    it('submits updates directly to the host render pass', function () {
        const renderer = Renderer.create({});
        const render_pass = {};
        sinon.stub(renderer.scene, 'updateScene').returns(true);

        const rendered = renderer.render({ force: true, renderPass: render_pass });

        assert.isTrue(rendered);
        assert.isTrue(renderer.scene.dirty);
        assert.isTrue(renderer.scene.updateScene.calledWith({ renderPass: render_pass }));
    });
});
