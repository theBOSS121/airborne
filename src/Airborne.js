import { GUI } from '../lib/dat.gui.module.js'
import { quat, mat4, vec3, vec4 } from '../lib/gl-matrix-module.js';
import { Application, GameState } from './Application.js'
import { Node } from './Node.js';
import { PlayerController } from './PlayerController.js';
import { Material } from './Material.js';
import { GLTFLoader } from './GLTFLoader.js';
import { Physics } from './Physics.js';
import { FuelController } from './FuelController.js';
import { CloudController } from './CloudController.js';

class Airborne extends Application {
    
    pauseElement = document.querySelector('.pause-container');
    gameOverElement = document.querySelector('.game-over-container');

    SECONDS_PER_BOOST = 20;

    async start() {

        this.state = GameState.START;

        // loading non GLTF objects and textures
        const [cube, envmap, grass] = await Promise.all([
            this.renderer.loadModel('./res/cube/cube.json'),
            this.renderer.loadTexture('./res/images/sky2.jpg', { min: this.gl.LINEAR, mag: this.gl.LINEAR }),
            this.renderer.loadTexture('./res/images/grass.png', { mip: true, min: this.gl.NEAREST_MIPMAP_NEAREST, mag: this.gl.NEAREST }),
        ]);
        
        // root
        this.root = new Node();
        
        // loading scene
        this.loader = new GLTFLoader(envmap),
        await this.loader.load('../res/scena/scena.gltf');
        this.scene = await this.loader.loadGLTFNodes(this.loader.defaultScene, {
            diffuse : 0.59,
            specular : 0.03,
            shininess : 0.1,
            effect : 0.8,
            reflectance : 0.32,
            transmittance : 0.02,
            ior : 0,
        });
        this.renderer.prepareGLTFNodes(this.scene);
        this.root.addChild(this.scene);

        // light / sun
        this.light = new Node();
        this.root.addChild(this.light);
        this.light.position = [0, 125, 0];
        this.light.color = [237, 205, 459];
        this.light.intensity = 5000;
        this.light.attenuation = [0.01, 0.2, 0.2];
        
        // airplane
        await this.loader.load('../res/plane/plane.gltf');
        this.airplane = await this.loader.loadGLTFNodes(this.loader.defaultScene, {
            diffuse : 0.8,
            specular : 0.1, //i
            shininess : 0.29,
            effect : 0.2, //i
            reflectance : 0.1, //implemented
            transmittance : 0.3,
            ior : 0.99,
        });
        this.renderer.prepareGLTFNodes(this.airplane);
        this.root.addChild(this.airplane);
        this.airplane.nodes[0].createBoundingBox(cube, grass)


        // camera
        this.camera = new Node();
        this.camera.projection = mat4.create();

        // initialize player controller
        this.playerController = new PlayerController(this.camera, this.airplane.nodes[0], this.canvas);
        this.airplane.nodes[0].addChild(this.camera);


        // initialize fuel controller
        this.fuelController = new FuelController(this.root, this.renderer, this.loader, 3, 5, cube, grass);
        await this.fuelController.loadNodes();

        // initialize clouds controller
        this.cloudController = new CloudController(this.root, this.renderer, this.loader, 12);
        await this.cloudController.loadNodes();


        // // island
        // await this.loader.load('../res/island/island_1.gltf');
        // this.island = await this.loader.loadGLTFNodes(this.loader.defaultScene);
        // this.renderer.prepareGLTFNodes(this.island);
        // this.island.nodes[0].translation = [150, 0, 10];
        // this.root.addChild(this.island);

        // // island 2
        // await this.loader.load('../res/island/island_1.gltf');
        // this.island2 = await this.loader.loadGLTFNodes(this.loader.defaultScene);
        // this.renderer.prepareGLTFNodes(this.island2);
        // this.island2.nodes[0].translation = [-300, 0, 10];
        // this.island.nodes[0].addChild(this.island2);

        // let a = quat.create()
        // quat.rotateY(a, a, Math.PI/2)
        // this.airplane.nodes[0].rotation = a;
        


        await this.loader.load('../res/fuel/fuel.gltf');
        this.fuel = await this.loader.loadGLTFNodes(this.loader.defaultScene);
        this.renderer.prepareGLTFNodes(this.fuel);

        // this is root of all objects

        // GLTF objects
        // this.root.ad+dChild(this.scene);
        // this.root.addChild(this.fuel);
        // objects        
        // this.funky = new Node();
        // this.cube1 = new Node();
        // this.fuel.nodes[0].addChild(this.cube1)
        // this.cube2 = new Node();
        // this.airplane.nodes[0].addChild(this.cube2)
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
        // this.cube1.material = new Material({ }, envmap);
        // this.cube1.material.texture = texture;
        // let min = this.fuel.nodes[0].mesh.primitives[0].attributes.POSITION.min;
        // let max = this.fuel.nodes[0].mesh.primitives[0].attributes.POSITION.max
        // this.cube1.scale = [(max[0]-min[0])/2,(max[1]-min[1])/2,(max[2]-min[2])/2]
        // this.cube2.model = cube;
        // this.cube2.material = new Material({}, envmap);
        // this.cube2.material.texture = grass
        // min = this.airplane.nodes[0].mesh.primitives[0].attributes.POSITION.min;
        // max = this.airplane.nodes[0].mesh.primitives[0].attributes.POSITION.max
        // this.cube2.scale = [(max[0]-min[0])/2,(max[1]-min[1])/2,(max[2]-min[2])/2]
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

        this.physics = new Physics(this.root);
        
        //this.physics = new Physics(this.root);
    }

    update(dt) {
        // this.island.nodes[0].rotation = quat.rotateY(this.island.nodes[0].rotation, this.island.nodes[0].rotation, dt)

        
        this.playerController.update(dt);
        this.fuelController.update(dt);
        this.cloudController.update(dt);
        this.physics.update(dt);
        
        this.light.translation = this.light.position;

        //-----------------------bloom-----------------------
        //this.renderer.createBloomBuffers();
        //-----------------------bloom-----------------------


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
        this.fuel.nodes[0].translation = [0, 0, this.fuel.nodes[0].translation[2]+0.01]
        // console.log(this.fuel.nodes[0].translation[2])
    }

    toggleGameState() {
        if (this.state == GameState.START) {
            this.state = GameState.PLAYING;
            this.pauseElement.style.display = 'none';
            this.pauseElement.querySelector('span').innerHTML = 'continue';
            this._update({wasPaused : true});
        } else if (this.state == GameState.PLAYING) {
            this.state = GameState.PAUSED;
            this.pauseElement.style.display = 'flex';
        } else if (this.state == GameState.PAUSED) {
            this.state = GameState.PLAYING;
            this.pauseElement.style.display = 'none';
            this._update({wasPaused : true});
        }
    }

    gameOver() {
        this.state = GameState.GAME_OVER;
        this.gameOverElement.style.display = 'flex';
        // restart();
    }
    
    render() {
        if (this.renderer) this.renderer.render(this.root, this.camera, this.light, this.skybox);
    }

    resize() { 
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspect = w / h;
        const fovy = Math.PI / 3;
        const near = 0.1
        // const far = Math.sqrt(2 * Math.pow(150, 2));
        const far = 1000
        mat4.perspective(this.camera.projection, fovy, aspect, near, far);

        //-----------------------bloom-----------------------
        //this.renderer.resize(w, h);
        //-----------------------bloom-----------------------
    }
}

// Connect app to canvas
const canvas = document.querySelector('canvas');
export let app = new Airborne(canvas);
await app.init();
// When app is initialised remove loading animation
document.querySelector('canvas').style.display = 'display';

// Make pause container visible
document.querySelector('.pause-container').style.display = 'flex';

// Remove loading animation
document.querySelector('.loader-container').remove();

// bullshit coede
async function restart() {
    document.querySelector('.game-over-container').style.display = 'none';
    document.querySelector('.pause-container').style.display = 'flex';
    app = new Airborne(canvas);
    await app.init();
    document.exitPointerLock();
}
const guiParentElement = document.querySelector('.player-container');
guiParentElement.style.display = 'flex';
app.playerController.fuelElement.startWidth = document.querySelector('.fuelbar').offsetWidth;