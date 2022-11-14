import { quat, vec2, vec3, mat4 } from '../lib/gl-matrix-module.js';

import { Node } from './Node.js';

export class FuelController {

    constructor(root, renderer, loader, fuelPerMinute, amountOfFuelAtStart) {
        this.root = root;
        this.renderer = renderer;
        this.loader = loader;
        this.fuelPerMinute = fuelPerMinute;
        this.amountOfFuelStart = amountOfFuelAtStart;
        this.fuels = [];

    }

    async loadNodes() {
        for (let i = 0; i < this.amountOfFuelStart; i++) await this.spawnFuel();
    }

    update(dt) {
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

        // this.light = new Node();
        // fuel.nodes[0].addChild(this.light);
        // this.light.color = [255, 247, 15];
        // this.light.intensity = 1;
    }
}