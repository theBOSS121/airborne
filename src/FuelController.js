import { quat, vec2, vec3, mat4 } from '../lib/gl-matrix-module.js';
import { app } from './Airborne.js';
import { Node, NodeType } from './Node.js';

export class FuelController {

    constructor(root, renderer, loader, fuelPerMinute, amountOfFuelAtStart, fuelValue, cube, grass) {
        this.root = root;
        this.renderer = renderer;
        this.loader = loader;
        this.fuelPerMinute = fuelPerMinute;
        this.amountOfFuelStart = amountOfFuelAtStart;
        this.fuels = [];
        this.fuelValue = fuelValue;

        this.audio = new Audio('../res/audio/boost.mp3');

        this.cube = cube;
        this.grass = grass;
    }

    async loadNodes() {
        for (let i = 0; i < this.amountOfFuelStart; i++) await this.spawnFuel();
    }

    async update(dt) {
        for (const fuel of this.fuels) {
            fuel.nodes[0].rotation = quat.rotateY(fuel.nodes[0].rotation, fuel.nodes[0].rotation, dt/2);
        }

        // randomly spawn new fuel
        // if (this.fuels.length < this.amountOfFuelStart) {
            const chance =  dt / ( (60 / this.fuelPerMinute)); // 
            const x = Math.random();
            if (x < chance) {
                await this.spawnFuel();
            }
        // }
    }

    async pickedUp(fuelNode) {
        this.audio.play();
        this.removeFuel(fuelNode);
        app.playerController.fuel += this.fuelValue;
    }

    // removes fuel from fuels array so new fuel can be spawned
    removeFuel(fuelNode) {
        this.root.removeChild(fuelNode.parentNode);
        const index = this.fuels.indexOf(fuelNode);
        this.fuels.splice(index, 1);
        fuelNode.removed = true;
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
        this.fuels.push(fuel);
        fuel.nodes[0].scale = [2, 2, 2];
        this.renderer.prepareGLTFNodes(fuel);
        // fuel.nodes[0].createBoundingBox(this.cube, this.grass);
        fuel.itisfuckingstupid = 'fuel'
        fuel.nodes[0].itisfuckingstupid = 'fuel.nodes[0]'
        fuel.nodes[0].translation = translation;
        fuel.nodes[0].nodeType = NodeType.FUEL;
        fuel.nodes[0].parentNode = fuel; // implementation to get fuel GLTFNode
        this.root.addChild(fuel);

        // check if fuel is spawned in an element, then remove it and call the function again
        this.root.traverse(other => {
            if (fuel.nodes[0] !== other &&  other.collidable) {
                if (fuel.nodes[0].removed) return;
                if (app.physics.resolveCollision(fuel.nodes[0], other, true)) {
                    this.removeFuel(fuel.nodes[0]);
                    this.spawnFuel();
                }
            }
        });       
    }
}