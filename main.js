import { GUI } from './lib/dat.gui.module.js'
import { mat4 } from './lib/gl-matrix-module.js';
import { Application } from './Application.js'
import { WebGL } from './WebGL.js'
import {shaders} from './shaders.js'

class App extends Application {
    async start() {
        const gl = this.gl;
        this.programs = WebGL.buildPrograms(gl, shaders);
        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        
        const vertices = new Float32Array([
            //  positions      texcoords        index
            -1, -1, -1,  1,      0,  0,      //   0
            -1,  1, -1,  1,      0,  1,      //   1
            -1, -1,  1,  1,      1,  0,      //   2
            -1,  1,  1,  1,      1,  1,      //   3
             1, -1,  1,  1,      2,  0,      //   4
             1,  1,  1,  1,      2,  1,      //   5
             1, -1, -1,  1,      3,  0,      //   6
             1,  1, -1,  1,      3,  1,      //   7
            -1, -1, -1,  1,      4,  0,      //   8
            -1,  1, -1,  1,      4,  1,      //   9
             1, -1, -1,  1,      0, -1,      //  10
             1,  1, -1,  1,      0,  2,      //  11
             1, -1,  1,  1,      1, -1,      //  12
             1,  1,  1,  1,      1,  2,      //  13
        ]);

        const indices = new Uint16Array([
             0,  2,  1,      1,  2,  3,
             2,  4,  3,      3,  4,  5,
             4,  6,  5,      5,  6,  7,
             6,  8,  7,      7,  8,  9,
             1,  3, 11,     11,  3, 13,
            10, 12,  0,      0, 12,  2,
        ]);
        
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16);

        this.modelMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
        this.mvpMatrix = mat4.create();
        mat4.fromTranslation(this.viewMatrix, [ 0, 0, 5 ]);
        this.isRotationEnabled = true;
        this.isPerspectiveCorrect = true;

        const response = await fetch('./res/images/crate-diffuse.png');
        const blob = await response.blob();
        const imageBitmap = await createImageBitmap(blob);

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBitmap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        this.isLinearFilter = false;
        this.isPerspectiveCorrect = true;
        this.textureScale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.scaleX = 1;
        this.scaleY = 1;
    }
    
    update() {
        if (this.isRotationEnabled) {
            const time = performance.now();
            mat4.identity(this.modelMatrix);
            mat4.fromScaling(this.modelMatrix, [this.scaleX, this.scaleY, 1, 1])
            mat4.fromTranslation(this.modelMatrix, [this.offsetX, this.offsetY, 0])
            mat4.rotateX(this.modelMatrix, this.modelMatrix, time * 0.0007);
            mat4.rotateY(this.modelMatrix, this.modelMatrix, time * 0.0006);
            this.updateModelViewProjection();
        }
    }

    render() {
        const gl = this.gl;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.bindVertexArray(this.vao);
        // Draw the first triangle with the first program.
        const { program, uniforms } = this.programs.simple;
        gl.useProgram(program);

        gl.uniform1i(uniforms.uPerspectiveCorrect, this.isPerspectiveCorrect);
        gl.uniformMatrix4fv(uniforms.uModelViewProjection, false, this.mvpMatrix);
        gl.uniform1f(uniforms.uTextureScale, this.textureScale);
        // gl.uniform4f(uniforms.uOffset, 0.4 + this.offsetX, 0 + this.offsetY, 0, 1);
        // gl.uniform4f(uniforms.uScale, this.scaleX, this.scaleY, 0, 1);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(uniforms.uTexture, 0);

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspect = w / h;
        const fovy = Math.PI / 3;
        const near = 0.1;
        const far = 100;

        mat4.perspective(this.projectionMatrix, fovy, aspect, near, far);
    }

    updateModelViewProjection() {
        const matrix = this.mvpMatrix;
        mat4.copy(matrix, this.modelMatrix);
        const view = mat4.invert(mat4.create(), this.viewMatrix);
        mat4.mul(matrix, view, matrix);
        mat4.mul(matrix, this.projectionMatrix, matrix);
    }

    changeFilter() {
        const gl = this.gl;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        const filter = this.isLinearFilter ? gl.LINEAR : gl.NEAREST;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    }
}

const canvas = document.querySelector('canvas')
const app = new App(canvas)
await app.init()
document.querySelector('.loader-container').remove()

const gui = new GUI()
// gui.addColor(app, 'color')
gui.add(app, 'offsetX', -10, 10);
gui.add(app, 'offsetY', -10, 10);
gui.add(app, 'scaleX', 0, 5);
gui.add(app, 'scaleY', 0, 5);
gui.add(app, 'isLinearFilter').name('Linear filtering').onChange(e => app.changeFilter());
gui.add(app, 'isPerspectiveCorrect').name('Perspective-correct');
gui.add(app, 'textureScale').name('Texture scale');
gui.add(app, 'isRotationEnabled').name('Enable rotation');