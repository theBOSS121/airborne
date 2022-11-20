import { quat, vec2, vec3, mat4 } from '../lib/gl-matrix-module.js';

import { Node } from './Node.js';

//import { Renderer } from './Renderer.js';

export class FuelController {

    constructor(root, renderer, loader, fuelPerMinute, amountOfFuelAtStart, cube, grass) {
        this.root = root;
        this.renderer = renderer;
        this.loader = loader;
        this.fuelPerMinute = fuelPerMinute;
        this.amountOfFuelStart = amountOfFuelAtStart;
        this.fuels = [];

        this.cube = cube;
        this.grass = grass;
    }

    async loadNodes() {
        for (let i = 0; i < this.amountOfFuelStart; i++) await this.spawnFuel();
    }

    update(dt) {
        //-----------------------bloom-----------------------
        /*this.renderer = new Renderer();
        this.renderer.createBloomBuffers();*/
        //-----------------------bloom-----------------------


        for (const fuel of this.fuels) {
            fuel.nodes[0].rotation = quat.rotateY(fuel.nodes[0].rotation, fuel.nodes[0].rotation, dt/2);
        }
    }

    async spawnFuel() {
        const translation = [Math.random() * 250 - 125, Math.random() * 120 - 60, Math.random() * 250 - 125];
        await this.loader.load('../res/fuel/fuel.gltf');
        const fuel = await this.loader.loadGLTFNodes(this.loader.defaultScene, {
            diffuse : 0.75,
            specular : 0.45,
            shininess : 0.4,
            effect : 0.5,
            reflectance : 0.4,
            transmittance : 0.22,
            ior : 0,
        });
        this.renderer.prepareGLTFNodes(fuel);
        this.root.addChild(fuel);
        this.fuels.push(fuel);
        fuel.nodes[0].translation = translation;
        fuel.nodes[0].scale = [2, 2, 2];
        fuel.nodes[0].createBoundingBox(this.cube, this.grass);

        //-----------------------bloom-----------------------
        /*
        const fuelEmissionImage = await this.loadImage('../res/fuel/ring.png');
        const fuelEmissionTexture = this.renderer.createTexture(fuelEmissionImage);
        fuel.nodes[0].emissionTexture = fuelEmissionTexture;*/
        //-----------------------bloom-----------------------
        

        // TODO: make boosts gloom

        // this.light = new Node();
        // fuel.nodes[0].addChild(this.light);
        // this.light.color = [255, 247, 15];
        // this.light.position = [0, 5, 0];
        // this.light.intensity = 1;
    }

        //-----------------------bloom-----------------------
    /*loadImage(uri) {
        return new Promise((resolve, reject) => {
            let image = new Image();
            image.addEventListener('load', e => resolve(image));
            image.addEventListener('error', reject);
            image.src = uri;
        });
    }

    loadJson(uri) {
        return fetch(uri).then(response => response.json());
    }*/
    //-----------------------bloom-----------------------
}