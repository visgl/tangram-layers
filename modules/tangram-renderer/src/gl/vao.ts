// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

// Creates a Vertex Array Object if the extension is available, or falls back on standard attribute calls

import getExtension from './extensions';
import log from '../utils/log';

const native_extensions = new WeakMap<object, any>();

function getVertexArrayExtension(gl: any): any {
    const extension = getExtension(gl, 'OES_vertex_array_object');
    if (extension || typeof gl.createVertexArray !== 'function') {
        return extension;
    }

    if (!native_extensions.has(gl)) {
        native_extensions.set(gl, {
            createVertexArrayOES: () => gl.createVertexArray(),
            deleteVertexArrayOES: (vao: any) => gl.deleteVertexArray(vao),
            bindVertexArrayOES: (vao: any) => gl.bindVertexArray(vao)
        });
    }
    return native_extensions.get(gl);
}

const Vao: any = {

    disabled: false, // set to true to disable VAOs even if extension is available
    bound_vao: [],   // currently bound VAO, by GL context

    init (gl: any) {
        let ext;
        if (this.disabled !== true) {
            ext = getVertexArrayExtension(gl);
        }

        if (ext != null) {
            log('info', 'Vertex Array Object extension available');
        }
        else if (this.disabled !== true) {
            log('warn', 'Vertex Array Object extension NOT available');
        }
        else {
            log('warn', 'Vertex Array Object extension force disabled');
        }
    },

    getExtension(gl: any, ext_name: string) {
        if (this.disabled !== true) {
            if (ext_name === 'OES_vertex_array_object') {
                return getVertexArrayExtension(gl);
            }
            return getExtension(gl, ext_name);
        }
    },

    create (gl: any, setup: () => void, teardown?: () => void) {
        let vao: any = {};
        vao.setup = setup;
        vao.teardown = teardown;

        let ext = this.getExtension(gl, 'OES_vertex_array_object');
        if (ext != null) {
            vao._vao = ext.createVertexArrayOES();
            ext.bindVertexArrayOES(vao._vao);
        }

        vao.setup();

        return vao;
    },

    getCurrentBinding (gl: any) {
        let bound = this.bound_vao.filter((e: any[]) => e[0] === gl)[0];
        return bound && bound[1];
    },

    setCurrentBinding (gl: any, vao: any) {
        let bound_vao = this.bound_vao;
        let binding = bound_vao.filter((e: any[]) => e[0] === gl)[0];
        if (binding == null) {
            bound_vao.push([gl, vao]);
        }
        else {
            binding[1] = vao;
        }
    },

    bind (gl: any, vao: any) {
        let ext = this.getExtension(gl, 'OES_vertex_array_object');
        if (vao != null) {
            if (ext != null && vao._vao != null) {
                ext.bindVertexArrayOES(vao._vao);
                this.setCurrentBinding(gl, vao);
            }
            else {
                vao.setup();
            }
        }
        else {
            let bound_vao = this.getCurrentBinding(gl);
            if (ext != null) {
                ext.bindVertexArrayOES(null);
            }
            else if (bound_vao != null && typeof bound_vao.teardown === 'function') {
                bound_vao.teardown();
            }
            this.setCurrentBinding(gl, null);
        }
    },

    destroy (gl: any, vao: any) {
        let ext = this.getExtension(gl, 'OES_vertex_array_object');
        if (ext != null && vao != null && vao._vao != null) {
            ext.deleteVertexArrayOES(vao._vao);
            vao._vao = null;
        }
        // destroy is a no-op if VAO extension isn't available
    }

};

export default Vao;
