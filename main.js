import { GUI } from './lib/dat.gui.module.js'
import { mat2, mat4 } from './lib/gl-matrix-module.js';
import { Application } from './Application.js'
import { Node } from './Node.js';
import { Renderer } from './Renderer.js';
import { Material } from './Material.js';
import { FirstPersonController } from './FirstPersonController.js';
import { WebGL } from './WebGL.js'
import {shaders} from './shaders.js'

class App extends Application {

    async start() {
        const gl = this.gl;
        this.renderer = new Renderer(gl);

        this.time = performance.now();
        this.startTime = this.time;

        this.root = new Node();        
        this.camera = new Node();
        this.light = new Node();
        this.funky = new Node();
        this.skybox = new Node();
        this.root.addChild(this.camera);
        this.root.addChild(this.funky);
        this.root.addChild(this.light);
        
        this.light.position = [0, 0, 0];
        this.light.color = [255, 255, 255];
        this.light.intensity = 1;
        this.light.attenuation = [0.001, 0, 0.3];
        
        this.cameraController = new FirstPersonController(this.camera, this.canvas);
        this.cameraController.pitch = -Math.PI / 6;
        this.camera.projection = mat4.create();
        this.camera.translation = [0, 2, 5];

        const [cube, funky, texture, envmap] = await Promise.all([
            this.renderer.loadModel('./res/cube/cube.json'),
            this.renderer.loadModel('./res/funky/funky.json'),
            this.renderer.loadTexture('./res/images/grayscale.png', {
                mip: true,
                min: gl.NEAREST_MIPMAP_NEAREST,
                mag: gl.NEAREST,
            }),
            this.renderer.loadTexture('./res/images/envmap2.jpg', {
                min: gl.LINEAR,
                mag: gl.LINEAR,
            }),
        ]);

        this.skybox.model = cube;
        this.skybox.material = new Material();
        this.skybox.material.envmap = envmap;

        this.funky.model = funky;
        this.funky.material = new Material();
        this.funky.material.texture = texture;
        this.funky.material.envmap = envmap;

        this.floor = new Node();
        this.floor.scale = [10, 1, 10];
        this.root.addChild(this.floor);

        this.cube1 = new Node();
        this.cube2 = new Node();
        this.cube3 = new Node();

        this.root.addChild(this.cube1);
        this.root.addChild(this.cube2);
        this.cube2.addChild(this.cube3);

        this.leftRotation = 0;
        this.rightRotation = 0;

        let [model, texture1] = await Promise.all([
            this.renderer.loadModel('./res/floor/floor.json'),
            this.renderer.loadTexture('./res/images/grass.png', {
                mip: true,
                min: gl.NEAREST_MIPMAP_NEAREST,
                mag: gl.NEAREST,
            }),
        ]);

        this.floor.model = model;
        this.floor.texture1 = texture1;

        let [model2, texture2] = await Promise.all([
            this.renderer.loadModel('./res/cube/cube.json'),
            this.renderer.loadTexture('./res/images/crate-diffuse.png', {
                mip: true,
                min: gl.NEAREST_MIPMAP_NEAREST,
                mag: gl.NEAREST,
            }),
        ]);

        this.cube1.model = model2;
        this.cube1.material = new Material();
        this.cube1.material.texture = texture;
        this.cube1.material.envmap = envmap;
        this.cube2.model = model2;
        this.cube2.material = new Material();
        this.cube2.material.texture = texture2;
        this.cube2.material.envmap = envmap;
        this.cube3.model = model2;
        this.cube3.material = new Material();
        this.cube3.material.texture = texture2;
        this.cube3.material.envmap = envmap;

    }
    
    update() {
        const t1 = this.cube1.localMatrix;
        mat4.fromTranslation(t1, [-2, 1, -5]);
        mat4.rotateX(t1, t1, this.leftRotation);
        this.cube1.localMatrix = t1

        const t2 = this.cube2.localMatrix;
        mat4.fromTranslation(t2, [2, 1, -5]);
        mat4.rotateX(t2, t2, this.rightRotation);
        this.cube2.localMatrix = t2

        const t3 = this.cube3.localMatrix;
        mat4.fromTranslation(t3, [-1, 2, -3]);
        mat4.rotateY(t3, t3, 1);
        this.cube3.localMatrix = t3

        
        this.time = performance.now();
        const dt = (this.time - this.startTime) * 0.001;
        this.startTime = this.time;

        this.cameraController.update(dt);

        this.light.translation = this.light.position;
    }

    render() {
        this.renderer.render(this.root, this.camera, this.light, this.skybox);
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspect = w / h;
        const fovy = Math.PI / 3;
        const near = 0.1;
        const far = 100;

        mat4.perspective(this.camera.projection, fovy, aspect, near, far);
    }

}

const canvas = document.querySelector('canvas')
const app = new App(canvas)
await app.init()
document.querySelector('.loader-container').remove()

const gui = new GUI()
gui.add(app.renderer, 'perFragment').onChange(perFragment => {
    app.renderer.currentProgram = perFragment
        ? app.renderer.programs.perFragment
        : app.renderer.programs.perVertex;
});

const light = gui.addFolder('Light');
light.open();
light.add(app.light, 'intensity', 0, 5);
light.addColor(app.light, 'color');
const lightPosition = light.addFolder('Position');
lightPosition.open();
lightPosition.add(app.light.position, 0, -10, 10).name('x');
lightPosition.add(app.light.position, 1, -10, 10).name('y');
lightPosition.add(app.light.position, 2, -10, 10).name('z');
const lightAttenuation = light.addFolder('Attenuation');
lightAttenuation.open();
lightAttenuation.add(app.light.attenuation, 0, 0, 5).name('constant');
lightAttenuation.add(app.light.attenuation, 1, 0, 2).name('linear');
lightAttenuation.add(app.light.attenuation, 2, 0, 1).name('quadratic');

const material = gui.addFolder('Material');
material.open();
material.add(app.funky.material, 'diffuse', 0, 1);
material.add(app.funky.material, 'specular', 0, 1);
material.add(app.funky.material, 'shininess', 1, 200);


gui.add(app.funky.material, 'effect', 0, 1);
gui.add(app.funky.material, 'reflectance', 0, 1);
gui.add(app.funky.material, 'transmittance', 0, 1);
gui.add(app.funky.material, 'ior', 0, 1);

gui.add(app.cameraController, 'pointerSensitivity', 0.0001, 0.01);
gui.add(app.cameraController, 'maxSpeed', 0, 10);
gui.add(app.cameraController, 'decay', 0, 1);
gui.add(app.cameraController, 'acceleration', 1, 100);
gui.add(app, 'leftRotation', -3, 3);
gui.add(app, 'rightRotation', -3, 3);
// gui.addColor(app, 'color')
// gui.add(app, 'offsetX', -10, 10);
// gui.add(app, 'offsetY', -10, 10);
// gui.add(app, 'scaleX', 0, 5);
// gui.add(app, 'scaleY', 0, 5);
// gui.add(app, 'isLinearFilter').name('Linear filtering').onChange(e => app.changeFilter());
// gui.add(app, 'isPerspectiveCorrect').name('Perspective-correct');
// gui.add(app, 'textureScale').name('Texture scale');
// gui.add(app, 'isRotationEnabled').name('Enable rotation');