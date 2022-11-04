import { GUI } from './lib/dat.gui.module.js'
import { mat2, mat4 } from './lib/gl-matrix-module.js';
import { Application } from './Application.js'
import { Node } from './Node.js';
import { Renderer } from './Renderer.js';
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
        this.camera.translation = [0, 1, 0];
        this.camera.projection = mat4.create();
        this.root.addChild(this.camera);
        
        this.controller = new FirstPersonController(this.camera, this.canvas);

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

        let [model, texture] = await Promise.all([
            this.renderer.loadModel('./res/floor/floor.json'),
            this.renderer.loadTexture('./res/images/grass.png', {
                mip: true,
                min: gl.NEAREST_MIPMAP_NEAREST,
                mag: gl.NEAREST,
            }),
        ]);

        this.floor.model = model;
        this.floor.texture = texture;

        let [model2, texture2] = await Promise.all([
            this.renderer.loadModel('./res/cube/cube.json'),
            this.renderer.loadTexture('./res/images/crate-diffuse.png', {
                mip: true,
                min: gl.NEAREST_MIPMAP_NEAREST,
                mag: gl.NEAREST,
            }),
        ]);

        this.cube1.model = model2;
        this.cube2.model = model2;
        this.cube3.model = model2;
        this.cube1.texture = texture2;
        this.cube2.texture = texture2;
        this.cube3.texture = texture2;
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

        this.controller.update(dt);
    }

    render() {
        this.renderer.render(this.root, this.camera)
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspect = w / h;
        const fovy = Math.PI / 2;
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
gui.add(app.controller, 'pointerSensitivity', 0.0001, 0.01);
gui.add(app.controller, 'maxSpeed', 0, 10);
gui.add(app.controller, 'decay', 0, 1);
gui.add(app.controller, 'acceleration', 1, 100);
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