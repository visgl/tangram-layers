import chai from 'chai';
let assert = chai.assert;
import VertexLayout from '../src/gl/vertex_layout';
import VertexData from '../src/gl/vertex_data';
import gl from '../src/gl/constants';

describe('VertexLayout', () => {

    // Note: a_color is intentionally not a multiple of 4, to test padding
    let attribs =  [
        { name: 'a_position', size: 3, type: gl.FLOAT, normalized: false },
        { name: 'a_color', size: 3, type: gl.UNSIGNED_BYTE, normalized: true }, // should be padded to 4 bytes
        { name: 'a_layer', size: 1, type: gl.FLOAT, normalized: false }
    ];

    describe('.constructor(attribs)', () => {
        let subject;
        beforeEach(() => {
            subject = new VertexLayout(attribs);
        });

        it('returns a new instance', () => {
            assert.instanceOf(subject, VertexLayout);
        });
        it('calculates the right vertex stride', () => {
            assert.equal(subject.stride, 20);
        });
    });

    describe('.createVertexData()', () => {
        let subject;
        let vertex_data;

        beforeEach(() => {
            subject = new VertexLayout(attribs);
            vertex_data = subject.createVertexData();
        });

        it('creates a vertex data buffer', () => {
            assert.instanceOf(vertex_data, VertexData);
        });
    });

    describe('.getBufferLayout()', () => {
        it('describes interleaved dynamic attributes with luma.gl vertex formats', () => {
            const subject = new VertexLayout(attribs);

            assert.deepEqual(subject.getBufferLayout(), {
                name: 'vertices',
                byteStride: 20,
                attributes: [
                    { attribute: 'a_position', format: 'float32x3', byteOffset: 0 },
                    { attribute: 'a_color', format: 'unorm8x3-webgl', byteOffset: 12 },
                    { attribute: 'a_layer', format: 'float32', byteOffset: 16 }
                ]
            });
        });

        it('reports static attributes separately from the vertex buffer', () => {
            const subject = new VertexLayout([
                { name: 'a_position', size: 2, type: gl.SHORT, normalized: false },
                { name: 'a_color', size: 4, type: gl.UNSIGNED_BYTE, normalized: true, static: [1, 0, 1, 1] }
            ]);

            assert.deepEqual(subject.getBufferLayout('mesh'), {
                name: 'mesh',
                byteStride: 4,
                attributes: [
                    { attribute: 'a_position', format: 'sint16x2', byteOffset: 0 }
                ]
            });
            assert.deepEqual(subject.getStaticAttributes(), [{
                attribute: 'a_color',
                value: [1, 0, 1, 1]
            }]);
        });
    });

});
