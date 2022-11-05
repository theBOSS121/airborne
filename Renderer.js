import { vec3, mat4 } from './lib/gl-matrix-module.js';
import { WebGL } from './WebGL.js';
import { shaders } from './shaders.js';

export class Renderer {

    constructor(gl) {
        this.gl = gl;

        gl.clearColor(1, 1, 1, 1); // set clear color to white
        gl.enable(gl.DEPTH_TEST); // enable depth test: draw pixels if they are closer to the camera
        gl.enable(gl.CULL_FACE);

        this.programs = WebGL.buildPrograms(gl, shaders); // get all programs (shaders)
        this.currentProgram = this.programs.perFragmentWithEnvmap; // set currentProgram
    }

    render(scene, camera, light, skybox) {
        const gl = this.gl;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear color and depth buffers

        const { program, uniforms } = this.currentProgram; // get shader and uniforms from current program
        // set shader
        gl.useProgram(program);
        // set uniforms
        const viewMatrix = camera.globalMatrix;
        mat4.invert(viewMatrix, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, camera.projection);
        gl.uniform3fv(uniforms.uCameraPosition, mat4.getTranslation(vec3.create(), camera.globalMatrix));
        gl.uniform3fv(uniforms.uLight.color, vec3.scale(vec3.create(), light.color, light.intensity / 255));
        gl.uniform3fv(uniforms.uLight.position, mat4.getTranslation(vec3.create(), light.globalMatrix));
        gl.uniform3fv(uniforms.uLight.attenuation, light.attenuation);
        // render scene
        this.renderNode(scene, scene.globalMatrix);
        // render Skybox / environment
        this.renderSkybox(skybox, camera);
    }

    renderNode(node, modelMatrix) {
        const gl = this.gl;

        modelMatrix = mat4.clone(modelMatrix);
        // multiply modelMatrix with localMatrix (children matrix is influenced be parent matrix)
        mat4.mul(modelMatrix, modelMatrix, node.localMatrix); 
        // get uniforms for current program
        const { uniforms } = this.currentProgram;
        // node has a model and material render it
        if (node.model && node.material) {
            gl.bindVertexArray(node.model.vao);
            // set model texture and uniform
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, node.material.texture);
            gl.uniform1i(uniforms.uTexture, 0);
            // set envorionment texture and uniform
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, node.material.envmap);
            gl.uniform1i(uniforms.uEnvmap, 1);
            // set modelMatrix uniform
            gl.uniformMatrix4fv(uniforms.uModelMatrix, false, modelMatrix);
            // set material uniforms for material reflection/refration
            gl.uniform1f(uniforms.uReflectance, node.material.reflectance);
            gl.uniform1f(uniforms.uTransmittance, node.material.transmittance);
            gl.uniform1f(uniforms.uIOR, node.material.ior);
            gl.uniform1f(uniforms.uEffect, node.material.effect);
            // set material uniforms for diffuse/specular light
            gl.uniform1f(uniforms.uMaterial.diffuse, node.material.diffuse);
            gl.uniform1f(uniforms.uMaterial.specular, node.material.specular);
            gl.uniform1f(uniforms.uMaterial.shininess, node.material.shininess);
            // draw model
            gl.drawElements(gl.TRIANGLES, node.model.indices, gl.UNSIGNED_SHORT, 0);
        }
        // render all nodes children
        for (const child of node.children) {
            this.renderNode(child, modelMatrix);
        }
    }

    renderSkybox(skybox, camera) {
        const gl = this.gl;
        // get shader program and uniforms for skybox shader
        const { program, uniforms } = this.programs.skybox;
        gl.useProgram(program); // use skybox shader program
        gl.bindVertexArray(skybox.model.vao);
        // set camera uniforms
        const viewMatrix = camera.globalMatrix;
        mat4.invert(viewMatrix, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, camera.projection);
        // set environment texture and uniform
        gl.activeTexture(gl.TEXTURE1);
        gl.uniform1i(uniforms.uEnvmap, 1);
        gl.bindTexture(gl.TEXTURE_2D, skybox.material.envmap);
        
        gl.depthFunc(gl.LEQUAL); // pass through if <= depth buffer value
        gl.disable(gl.CULL_FACE); // disable CULL_FACE
        gl.drawElements(gl.TRIANGLES, skybox.model.indices, gl.UNSIGNED_SHORT, 0); // draw skybox
        gl.enable(gl.CULL_FACE); // unset/enable CULL_FACE
        gl.depthFunc(gl.LESS); // unset depth function to <
    }

    createModel(model) {
        const gl = this.gl;

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.texcoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

        const indices = model.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);

        return { vao, indices };
    }
    // load model
    async loadModel(url) {
        const response = await fetch(url);
        const json = await response.json();
        return this.createModel(json);
    }
    // load texture
    async loadTexture(url, options) {
        const response = await fetch(url);
        const blob = await response.blob();
        const image = await createImageBitmap(blob);
        const spec = Object.assign({ image }, options);
        return WebGL.createTexture(this.gl, spec);
    }
}
