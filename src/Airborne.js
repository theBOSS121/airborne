import { GUI } from '../lib/dat.gui.module.js'
import { mat2, mat4, quat } from '../lib/gl-matrix-module.js';
import { Application } from './Application.js'
import { Node } from './Node.js';
import { CameraController } from './CameraController.js';
import { Material } from './Material.js';
import { GLTFLoader } from './GLTFLoader.js';
import { GLTFNodes } from './GLTFNodes.js';

class Airborne extends Application {
    
    async start() {
        // loading non GLTF objects and textures
        const [cube, funky, floor, texture, envmap, grass, crate] = await Promise.all([
            this.renderer.loadModel('./res/cube/cube.json'),
            this.renderer.loadModel('./res/funky/funky.json'),
            this.renderer.loadModel('./res/floor/floor.json'),
            this.renderer.loadTexture('./res/images/grayscale.png', { mip: true, min: this.gl.NEAREST_MIPMAP_NEAREST, mag: this.gl.NEAREST }),
            this.renderer.loadTexture('./res/images/skybox.png', { min: this.gl.LINEAR, mag: this.gl.LINEAR }),
            this.renderer.loadTexture('./res/images/grass.png', { mip: true, min: this.gl.NEAREST_MIPMAP_NEAREST, mag: this.gl.NEAREST }),
            this.renderer.loadTexture('./res/images/crate-diffuse.png', { mip: true, min: this.gl.NEAREST_MIPMAP_NEAREST, mag: this.gl.NEAREST }),
            
        ]);
        // loading GLTF objects
        this.loader = new GLTFLoader(envmap),
        await this.loader.load('../res/scena/scena.gltf');
        this.scene = await this.loader.loadGLTFNodes(this.loader.defaultScene);
        this.renderer.prepareGLTFNodes(this.scene);
        await this.loader.load('../res/letalo/letalo.gltf');
        this.airplane = await this.loader.loadGLTFNodes(this.loader.defaultScene);
        this.renderer.prepareGLTFNodes(this.airplane);
        let a = quat.create()
        quat.rotateY(a, a, Math.PI/2)
        this.airplane.nodes[0].rotation = a
        await this.loader.load('../res/gorivo/gorivo.gltf');
        this.fuel = await this.loader.loadGLTFNodes(this.loader.defaultScene);
        this.renderer.prepareGLTFNodes(this.fuel);

        // this is root of all objects
        this.root = new Node();
        // camera
        this.camera = new Node();
        this.root.addChild(this.camera);
        this.camera.projection = mat4.create();
        this.camera.translation = [0, 3, 4];
        this.camera.eulerRotation = [-Math.PI / 10, 0, 0];
        this.cameraController = new CameraController(this.camera, this.canvas);
        // light / sun
        this.light = new Node();
        this.root.addChild(this.light);
        this.light.position = [-40, 50, 40];
        this.light.color = [255, 255, 255];
        this.light.intensity = 1000;
        this.light.attenuation = [0.001, 0, 0.2];
        // GLTF objects
        this.root.addChild(this.scene);
        this.root.addChild(this.airplane);
        this.root.addChild(this.fuel);
        // objects        
        // this.funky = new Node();
        // this.cube1 = new Node();
        // this.cube2 = new Node();
        // this.cube3 = new Node();
        // this.floor = new Node();
        // this.root.addChild(this.funky);
        // this.root.addChild(this.floor);
        // this.root.addChild(this.cube1);
        // this.root.addChild(this.cube2);
        // this.cube2.addChild(this.cube3);
        

        // this.funky.model = funky;
        // this.funky.material = new Material({}, envmap);
        // this.funky.material.texture = texture;
        // this.floor.scale = [10, 1, 10];
        // this.floor.model = floor;
        // this.floor.material = new Material({}, envmap);
        // this.floor.material.texture = grass;
        // this.cube1.model = cube;
        // this.cube1.material = new Material({}, envmap);
        // this.cube1.material.texture = texture;
        // this.cube2.model = cube;
        // this.cube2.material = new Material({}, envmap);
        // this.cube2.material.texture = crate
        // this.cube3.model = cube;
        // this.cube3.material = new Material({}, envmap);
        // this.cube3.material.texture = crate;
        // // variables
        // this.leftRotation = 0;
        // this.rightRotation = 0;

        // sky box
        this.skybox = new Node();
        this.skybox.model = cube;
        this.skybox.material = new Material({}, envmap);
        
    }

    update(dt) {
        this.cameraController.update(dt);
        

        this.light.translation = this.light.position;
        // rotation and position of boxes should be set at init
        // update should only track and set changes
        // const t1 = this.cube1.localMatrix;
        // mat4.fromTranslation(t1, [-2, 1, -5]);
        // mat4.rotateX(t1, t1, this.leftRotation);
        // this.cube1.localMatrix = t1
        // const t2 = this.cube2.localMatrix;
        // mat4.fromTranslation(t2, [2, 1, -5]);
        // mat4.rotateX(t2, t2, this.rightRotation);
        // this.cube2.localMatrix = t2
        // const t3 = this.cube3.localMatrix;
        // mat4.fromTranslation(t3, [-1, 2, -3]);
        // mat4.rotateY(t3, t3, 1);
        // this.cube3.localMatrix = t3
    }
    
    render() {
        if (this.renderer) this.renderer.render(this.root, this.camera, this.light, this.skybox);
    }

    resize() { 
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspect = w / h;
        const fovy = Math.PI / 3;
        const near = 0.1;
        // const far = 100;
        const far = 1000;

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
light.add(app.light, 'intensity');
light.addColor(app.light, 'color');
const lightPosition = light.addFolder('Position');
lightPosition.open();
lightPosition.add(app.light.position, 0, -100, 100).name('x');
lightPosition.add(app.light.position, 1, -100, 100).name('y');
lightPosition.add(app.light.position, 2, -100, 100).name('z');
const lightAttenuation = light.addFolder('Attenuation');
lightAttenuation.open();
lightAttenuation.add(app.light.attenuation, 0, 0, 5).name('constant');
lightAttenuation.add(app.light.attenuation, 1, 0, 2).name('linear');
lightAttenuation.add(app.light.attenuation, 2, 0, 1).name('quadratic');
const material = gui.addFolder('Material');
material.open();
material.add(app.fuel.nodes[0].mesh.primitives[0].material, 'diffuse', 0, 1);
material.add(app.fuel.nodes[0].mesh.primitives[0].material, 'specular', 0, 1);
material.add(app.fuel.nodes[0].mesh.primitives[0].material, 'shininess', 1, 200);
material.add(app.fuel.nodes[0].mesh.primitives[0].material, 'effect', 0, 1);
material.add(app.fuel.nodes[0].mesh.primitives[0].material, 'reflectance', 0, 1);
material.add(app.fuel.nodes[0].mesh.primitives[0].material, 'transmittance', 0, 1);
material.add(app.fuel.nodes[0].mesh.primitives[0].material, 'ior', 0, 1);
const controller = gui.addFolder('Controller');
controller.add(app.cameraController, 'pointerSensitivity', 0.0001, 0.01);
controller.add(app.cameraController, 'maxSpeed', 0, 10);
controller.add(app.cameraController, 'decay', 0, 1);
controller.add(app.cameraController, 'acceleration', 1, 100);
// controller.add(app, 'leftRotation', -3, 3);
// controller.add(app, 'rightRotation', -3, 3);

// gui.addColor(app, 'color')
// gui.add(app, 'offsetX', -10, 10);
// gui.add(app, 'offsetY', -10, 10);
// gui.add(app, 'scaleX', 0, 5);
// gui.add(app, 'scaleY', 0, 5);
// gui.add(app, 'isLinearFilter').name('Linear filtering').onChange(e => app.changeFilter());
// gui.add(app, 'isPerspectiveCorrect').name('Perspective-correct');
// gui.add(app, 'textureScale').name('Texture scale');
// gui.add(app, 'isRotationEnabled').name('Enable rotation');