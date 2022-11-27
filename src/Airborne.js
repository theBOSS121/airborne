import { GUI } from '../lib/dat.gui.module.js'
import { mat4, vec3 } from '../lib/gl-matrix-module.js';
import { Application, GameState } from './Application.js'
import { Node } from './Node.js';
import { PlayerController } from './PlayerController.js';
import { Material } from './Material.js';
import { GLTFLoader } from './GLTFLoader.js';
import { Physics } from './Physics.js';
import { FuelController } from './FuelController.js';
import { CloudController } from './CloudController.js';
import { NodeType } from './Node.js';

class Airborne extends Application {
    
    pauseElement = document.querySelector('.pause-container');
    gameOverElement = document.querySelector('.game-over-container');
    fuelElement = document.querySelector('.fuelbar');


    async start() {
        this.state = GameState.START;

        // loading non GLTF objects and textures
        const [cube, envmap, grass] = await Promise.all([
            this.renderer.loadModel('./res/cube/cube.json'),
            this.renderer.loadTexture('./res/images/sky2.jpg', { min: this.gl.LINEAR, mag: this.gl.LINEAR }),
            this.renderer.loadTexture('./res/images/grass.png', { mip: true, min: this.gl.NEAREST_MIPMAP_NEAREST, mag: this.gl.NEAREST }),
        ]);

        // root
        this.root = new Node({ collidable: false });
        this.physics = new Physics(this.root);

        // envmap is not used if we are using nishita sky (insted of envmap)
        // loading scene
        this.loader = new GLTFLoader(envmap),
        await this.loader.load('./res/scena/scena.gltf');
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
        // for(let i = 0; i < this.scene.nodes.length; i++) {
        //     this.scene.nodes[i].createBoundingBox(cube, grass);
        // }

        // light / sun
        this.light = new Node({ collidable: false });
        this.root.addChild(this.light);
        this.light.translation = [0, 125, -300];
        this.light.color = [237, 205, 459];
        this.light.intensity = 5000;
        this.light.attenuation = [0.01, 0.2, 0.2];
        this.light.collidable = false;
        this.light.fi = this.time/20000;
        this.light.intensity = Math.sin(this.light.fi) * 500000 + 505000
        this.light.translation = [this.light.translation[0], Math.sin(this.light.fi)*500+500, this.light.translation[2]];
        
        // airplane
        await this.loader.load('./res/plane/plane.gltf');
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
        this.airplane.nodes[0].translation = [-60, 10, -10]
        this.airplane.nodes[0].nodeType = NodeType.PLAYER;
        // make airplanes bounding box smallest minmax box
        this.airplane.nodes[0].aabb.max[0] = this.airplane.nodes[0].aabb.max[1]
        this.airplane.nodes[0].aabb.max[2] = this.airplane.nodes[0].aabb.max[1]
        this.airplane.nodes[0].aabb.min[0] = -this.airplane.nodes[0].aabb.max[1]
        this.airplane.nodes[0].aabb.min[2] = -this.airplane.nodes[0].aabb.max[1]
        this.airplane.nodes[0].aabb.min[1] = -this.airplane.nodes[0].aabb.max[1]
        // this.airplane.nodes[0].createBoundingBox(cube, grass);
        this.root.addChild(this.airplane);
        

        // camera
        this.camera = new Node({ collidable: false });
        this.camera.projection = mat4.create();
        this.root.addChild(this.camera);

        // initialize player controller
        this.playerController = new PlayerController(this.airplane.nodes[0], this.camera, this.canvas);

        // initialize fuel controller
        this.fuelController = new FuelController(this.root, this.renderer, this.loader, 4, 5, 1/2, cube, grass);
        await this.fuelController.loadNodes();

        // initialize clouds controller
        this.cloudController = new CloudController(this.root, this.airplane, this.renderer, this.loader, 16);
        await this.cloudController.loadNodes();

        // sky box
        this.skybox = new Node();
        this.skybox.model = cube;
        this.skybox.material = new Material({}, envmap);
    }

    updateSun(dt) {
        this.light.fi = this.time/20000;
        if(this.light.fi > Math.PI/2 * 3) this.light.fi = Math.PI/2 * 3
        this.light.intensity = Math.sin(this.light.fi) * 500000 + 505000
        this.light.translation = [this.light.translation[0], Math.sin(this.light.fi)*500+500, this.light.translation[2]];
    }
    update(dt) {
        if (this.state == GameState.GAME_OVER || dt == 0) return;
        this.playerController.update(dt);
        this.fuelController.update(dt);
        this.cloudController.update(dt);
        this.physics.update(dt);
        this.updateSun(dt);
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
        this.gameOverElement.querySelector('#score-p span').innerHTML = this.playerController.playtime.toFixed(0);
        this.fuelElement.style.width = "0px";
        // restart();
    }
    
    render() {
        if (this.renderer) this.renderer.render(this.root, this.camera, this.light, this.skybox);
    }

    resize() { 
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspect = w / h;
        const fovy = Math.PI / 2.4;
        const near = 1;
        const far = 1000
        mat4.perspective(this.camera.projection, fovy, aspect, near, far);
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

// not used code
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