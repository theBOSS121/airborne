import { GUI } from './lib/dat.gui.module.js'
import { mat2, mat4 } from './lib/gl-matrix-module.js';
import { Application } from './Application.js'
import { Node } from './Node.js';
import { Renderer } from './Renderer.js';
import { Material } from './Material.js';
import { FirstPersonController } from './FirstPersonController.js';

class Airborne extends Application {
    // called before requseting first animation frame (before game loop starts)
    async start() {
        this.time = performance.now();
        this.startTime = this.time;
        const gl = this.gl;
        this.renderer = new Renderer(gl);
        // loading models and textures
        const [cube, funky, floor, texture, envmap, grass, crate] = await Promise.all([
            this.renderer.loadModel('./res/cube/cube.json'),
            this.renderer.loadModel('./res/funky/funky.json'),
            this.renderer.loadModel('./res/floor/floor.json'),
            this.renderer.loadTexture('./res/images/grayscale.png', {
                mip: true,
                min: gl.NEAREST_MIPMAP_NEAREST,
                mag: gl.NEAREST,
            }),
            this.renderer.loadTexture('./res/images/envmap2.jpg', {
                min: gl.LINEAR,
                mag: gl.LINEAR,
            }),            
            this.renderer.loadTexture('./res/images/grass.png', {
                mip: true,
                min: gl.NEAREST_MIPMAP_NEAREST,
                mag: gl.NEAREST,
            }),
            this.renderer.loadTexture('./res/images/crate-diffuse.png', {
                mip: true,
                min: gl.NEAREST_MIPMAP_NEAREST,
                mag: gl.NEAREST,
            }),
        ]);

        this.root = new Node();        
        // camera
        this.camera = new Node();
        this.root.addChild(this.camera); 
        this.cameraController = new FirstPersonController(this.camera, this.canvas);
        this.camera.projection = mat4.create();
        this.camera.translation = [0, 2, 8];

        this.light = new Node();
        this.root.addChild(this.light);
        this.light.position = [0, 1, 0];
        this.light.color = [255, 255, 255];
        this.light.intensity = 1;
        this.light.attenuation = [0.001, 0, 0.3];
        // sky box
        this.skybox = new Node();
        this.skybox.model = cube;
        this.skybox.material = new Material(envmap);
        // objects        
        this.funky = new Node();
        this.cube1 = new Node();
        this.cube2 = new Node();
        this.cube3 = new Node();
        this.floor = new Node();
        this.root.addChild(this.funky);
        this.root.addChild(this.floor);
        this.root.addChild(this.cube1);
        this.root.addChild(this.cube2);
        this.cube2.addChild(this.cube3);

        this.funky.model = funky;
        this.funky.material = new Material(envmap);
        this.funky.material.texture = texture;

        this.floor.scale = [10, 1, 10];
        this.floor.model = floor;
        this.floor.material = new Material(envmap);
        this.floor.material.texture = grass;
        this.cube1.model = cube;
        this.cube1.material = new Material(envmap);
        this.cube1.material.texture = texture;
        this.cube2.model = cube;
        this.cube2.material = new Material(envmap);
        this.cube2.material.texture = crate
        this.cube3.model = cube;
        this.cube3.material = new Material(envmap);
        this.cube3.material.texture = crate;
        // variables
        this.leftRotation = 0;
        this.rightRotation = 0;
    }
    // update everything
    update() {
        this.time = performance.now(); // get current time in millisecondes (with fractions)
        const dt = (this.time - this.startTime) * 0.001; // change of time between updates in seconde
        this.startTime = this.time;
        
        this.cameraController.update(dt);

        this.light.translation = this.light.position;
        // rotation and position of boxes should be set at init
        // update should only track and set changes
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
    }
    // render everything
    render() {
        this.renderer.render(this.root, this.camera, this.light, this.skybox);
    }

    // called if resized
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

// Connect app to canvas
const canvas = document.querySelector('canvas')
const app = new Airborne(canvas)
await app.init()
// when app is initialised remove loading animation
document.querySelector('.loader-container').remove()

// GUI
const gui = new GUI()
// gui.add(app.renderer, 'perFragment').onChange(perFragment => {
//     app.renderer.currentProgram = perFragment
//         ? app.renderer.programs.perFragment
//         : app.renderer.programs.perVertex;
// });

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
material.add(app.funky.material, 'effect', 0, 1);
material.add(app.funky.material, 'reflectance', 0, 1);
material.add(app.funky.material, 'transmittance', 0, 1);
material.add(app.funky.material, 'ior', 0, 1);
const controller = gui.addFolder('Controller');
controller.add(app.cameraController, 'pointerSensitivity', 0.0001, 0.01);
controller.add(app.cameraController, 'maxSpeed', 0, 10);
controller.add(app.cameraController, 'decay', 0, 1);
controller.add(app.cameraController, 'acceleration', 1, 100);
controller.add(app, 'leftRotation', -3, 3);
controller.add(app, 'rightRotation', -3, 3);

// gui.addColor(app, 'color')
// gui.add(app, 'offsetX', -10, 10);
// gui.add(app, 'offsetY', -10, 10);
// gui.add(app, 'scaleX', 0, 5);
// gui.add(app, 'scaleY', 0, 5);
// gui.add(app, 'isLinearFilter').name('Linear filtering').onChange(e => app.changeFilter());
// gui.add(app, 'isPerspectiveCorrect').name('Perspective-correct');
// gui.add(app, 'textureScale').name('Texture scale');
// gui.add(app, 'isRotationEnabled').name('Enable rotation');