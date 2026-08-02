import { assert } from 'chai';
import VBOMesh from '../src/gl/vbo_mesh';
import Scene from '../src/scene/scene';

describe('VBOMesh render backend', function () {
    it('delegates a mesh draw with the active render pass before issuing raw WebGL calls', function () {
        const render_pass = {};
        const program = {
            use_calls: 0,
            use() {
                this.use_calls++;
            }
        };
        const mesh = Object.assign(Object.create(VBOMesh.prototype), {
            created_at: +new Date(),
            fade_in_time: 0,
            valid: true
        });
        let draw_options;
        const mesh_renderer = {
            drawMesh(options) {
                draw_options = options;
                return true;
            }
        };

        assert.isTrue(mesh.render({
            program,
            renderPass: render_pass,
            meshRenderer: mesh_renderer
        }));
        assert.strictEqual(draw_options.mesh, mesh);
        assert.strictEqual(draw_options.program, program);
        assert.strictEqual(draw_options.renderPass, render_pass);
        assert.isNumber(draw_options.visibleTime);
        assert.strictEqual(program.use_calls, 0);
    });

    it('routes the active render pass and mesh renderer through Scene.renderStyle', function () {
        const render_pass = {};
        const mesh_renderer = { drawMesh() {} };
        const mesh = {
            geometry_count: 2,
            variant: { blend_order: 1, mesh_order: 0 }
        };
        const tile = {
            meshes: { polygons: [mesh] },
            proxy_level: 0,
            shouldProxyForStyle() {
                return true;
            }
        };
        let render_options;
        const scene = {
            mesh_renderer,
            styles: {
                polygons: {
                    render(rendered_mesh, options) {
                        assert.strictEqual(rendered_mesh, mesh);
                        render_options = options;
                        return false;
                    }
                }
            },
            tile_manager: {
                getRenderableTiles() {
                    return [tile];
                }
            },
            setupStyle() {
                return {};
            },
            view: {
                setupTile() {}
            },
            requestRedraw() {}
        };

        const count = Scene.prototype.renderStyle.call(
            scene,
            'polygons',
            'program',
            1,
            null,
            render_pass
        );

        assert.strictEqual(count, 2);
        assert.deepEqual(render_options, {
            renderPass: render_pass,
            meshRenderer: mesh_renderer
        });
    });
});
