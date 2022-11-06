import { mat4, vec3 } from './lib/gl-matrix-module.js';

import { WebGL } from './WebGL.js';

import { shaders } from './shaders.js';
import { GLTFLoader } from './GLTFLoader.js';
import { GLTFNodes } from './GLTFNodes.js';

// This class prepares all assets for use with WebGL
// and takes care of rendering.

export class Renderer {

    constructor(gl) {
        this.gl = gl;
        this.glObjects = new Map();
        this.programs = WebGL.buildPrograms(gl, shaders);

        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        this.defaultTexture = WebGL.createTexture(gl, {
            width: 1,
            height: 1,
            data: new Uint8Array([255, 255, 255, 255]),
        });

        this.defaultSampler = WebGL.createSampler(gl, {
            min: gl.NEAREST,
            mag: gl.NEAREST,
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE,
        });
    }

    render(scene, camera, light, skybox) {
        const gl = this.gl;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const { program, uniforms } = this.programs.perFragmentWithEnvmap;
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

        // const mvpMatrix = this.getViewProjectionMatrix(camera);
        for (const node of scene.children) {
            if(node instanceof GLTFNodes) {
                for (const primitive of node.nodes) {
                    this.renderNode(primitive, mat4.create())
                }
            }else {
                this.renderNode(node, mat4.create())
            }
        }
        
        // render Skybox / environment
        this.renderSkybox(skybox, camera);
    }
    
    renderNode(node, modelMatrix) {
        const gl = this.gl;

        modelMatrix = mat4.clone(modelMatrix);
        // multiply modelMatrix with localMatrix (children matrix is influenced be parent matrix)
        mat4.mul(modelMatrix, modelMatrix, node.localMatrix); 
        const { program, uniforms } = this.programs.perFragmentWithEnvmap;

        if (node.mesh) { // gltf objects drawing
            // set modelMatrix uniform
            gl.uniformMatrix4fv(uniforms.uModelMatrix, false, modelMatrix);
            for (const primitive of node.mesh.primitives) {
                this.renderPrimitive(primitive);
            }
        }else if(node.model && node.material) { // non gltf models
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

        for (const child of node.children) {
            this.renderNode(child, modelMatrix);
        }
    }

    renderPrimitive(primitive) {
        const gl = this.gl;

        const { program, uniforms } = this.programs.perFragmentWithEnvmap;

        const vao = this.glObjects.get(primitive);
        gl.bindVertexArray(vao);

        const material = primitive.material;
        // set texture uniform
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(uniforms.uTexture, 0);
        const texture = material.baseColorTexture;
        const glTexture = texture ? this.glObjects.get(texture.image) : this.defaultTexture;
        const glSampler = texture ? this.glObjects.get(texture.sampler) : this.defaultSampler;
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.bindSampler(0, glSampler);

        // set envorionment texture and uniform
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, primitive.material.envmap);
        gl.uniform1i(uniforms.uEnvmap, 1);        
        // set material uniforms for material reflection/refration
        gl.uniform1f(uniforms.uReflectance, primitive.material.reflectance);
        gl.uniform1f(uniforms.uTransmittance, primitive.material.transmittance);
        gl.uniform1f(uniforms.uIOR, primitive.material.ior);
        gl.uniform1f(uniforms.uEffect, primitive.material.effect);
        // set material uniforms for diffuse/specular light
        gl.uniform1f(uniforms.uMaterial.diffuse, primitive.material.diffuse);
        gl.uniform1f(uniforms.uMaterial.specular, primitive.material.specular);
        gl.uniform1f(uniforms.uMaterial.shininess, primitive.material.shininess);


        if (primitive.indices) {
            const mode = primitive.mode;
            const count = primitive.indices.count;
            const type = primitive.indices.componentType;
            gl.drawElements(mode, count, type, 0);
        } else {
            const mode = primitive.mode;
            const count = primitive.attributes.POSITION.count;
            gl.drawArrays(mode, 0, count);
        }
    }
    // renders the environment using skybox shader
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

    // ----------------------------------------
    // not gltf -------------------------------
    // ----------------------------------------

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

    // ---------------------------------------
    // gltf specific -------------------------
    // ---------------------------------------
    
    prepareBufferView(bufferView) {
        if (this.glObjects.has(bufferView)) {
            return this.glObjects.get(bufferView);
        }

        const buffer = new DataView(
            bufferView.buffer,
            bufferView.byteOffset,
            bufferView.byteLength);
        const glBuffer = WebGL.createBuffer(this.gl, {
            target : bufferView.target,
            data   : buffer
        });
        this.glObjects.set(bufferView, glBuffer);
        return glBuffer;
    }

    prepareSampler(sampler) {
        if (this.glObjects.has(sampler)) {
            return this.glObjects.get(sampler);
        }

        const glSampler = WebGL.createSampler(this.gl, sampler);
        this.glObjects.set(sampler, glSampler);
        return glSampler;
    }

    prepareImage(image) {
        if (this.glObjects.has(image)) {
            return this.glObjects.get(image);
        }

        const glTexture = WebGL.createTexture(this.gl, { image });
        this.glObjects.set(image, glTexture);
        return glTexture;
    }

    prepareTexture(texture) {
        const gl = this.gl;

        this.prepareSampler(texture.sampler);
        const glTexture = this.prepareImage(texture.image);

        const mipmapModes = [
            gl.NEAREST_MIPMAP_NEAREST,
            gl.NEAREST_MIPMAP_LINEAR,
            gl.LINEAR_MIPMAP_NEAREST,
            gl.LINEAR_MIPMAP_LINEAR,
        ];

        if (!texture.hasMipmaps && mipmapModes.includes(texture.sampler.min)) {
            gl.bindTexture(gl.TEXTURE_2D, glTexture);
            gl.generateMipmap(gl.TEXTURE_2D);
            texture.hasMipmaps = true;
        }
    }

    prepareMaterial(material) {
        if (material.baseColorTexture) {
            this.prepareTexture(material.baseColorTexture);
        }
        if (material.metallicRoughnessTexture) {
            this.prepareTexture(material.metallicRoughnessTexture);
        }
        if (material.normalTexture) {
            this.prepareTexture(material.normalTexture);
        }
        if (material.occlusionTexture) {
            this.prepareTexture(material.occlusionTexture);
        }
        if (material.emissiveTexture) {
            this.prepareTexture(material.emissiveTexture);
        }
    }

    preparePrimitive(primitive) {
        if (this.glObjects.has(primitive)) {
            return this.glObjects.get(primitive);
        }

        this.prepareMaterial(primitive.material);

        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        if (primitive.indices) {
            const bufferView = primitive.indices.bufferView;
            bufferView.target = gl.ELEMENT_ARRAY_BUFFER;
            const buffer = this.prepareBufferView(bufferView);
            gl.bindBuffer(bufferView.target, buffer);
        }

        // this is an application-scoped convention, matching the shader
        const attributeNameToIndexMap = {
            POSITION   : 0,
            TEXCOORD_0 : 1,
            NORMAL     : 2,
            TANGENT    : 3,
            TEXCOORD_1 : 4,
            COLOR_0    : 5,
        };

        for (const name in primitive.attributes) {
            const accessor = primitive.attributes[name];
            const bufferView = accessor.bufferView;
            const attributeIndex = attributeNameToIndexMap[name];

            if (attributeIndex !== undefined) {
                bufferView.target = gl.ARRAY_BUFFER;
                const buffer = this.prepareBufferView(bufferView);
                gl.bindBuffer(bufferView.target, buffer);
                gl.enableVertexAttribArray(attributeIndex);
                gl.vertexAttribPointer(
                    attributeIndex,
                    accessor.numComponents,
                    accessor.componentType,
                    accessor.normalized,
                    bufferView.byteStride,
                    accessor.byteOffset);
            }
        }

        this.glObjects.set(primitive, vao);
        return vao;
    }

    prepareMesh(mesh) {
        for (const primitive of mesh.primitives) {
            this.preparePrimitive(primitive);
        }
    }

    prepareNode(node) {
        if (node.mesh) {
            this.prepareMesh(node.mesh);
        }
        for (const child of node.children) {
            this.prepareNode(child);
        }
    }

    prepareGLTFNodes(scene) {
        for (const node of scene.nodes) {
            this.prepareNode(node);
        }
    }

}
