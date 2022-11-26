import { NodeType , Node } from './Node.js';

export class CloudController {

    constructor(root, airplane, renderer, loader, amountOfCloudsAtStart) {
        this.root = root;
        this.airplane = airplane;
        this.renderer = renderer;
        this.loader = loader;
        this.amountOfCloudsAtStart = amountOfCloudsAtStart;
        this.clouds = new Node({ collidable: false, nodeType: NodeType.CLOUD});
        root.addChild(this.clouds);
    }

    async loadNodes() {
        for (let i = 0; i < this.amountOfCloudsAtStart; i++) await this.spawnCloud();
    }

    update(dt) {   
        for (let cloud of this.clouds.children) {
            const x = cloud.nodes[0].translation[0];
            const z = cloud.nodes[0].translation[2];
            if (Math.abs(x) > 150 || Math.abs(z) > 150) {
                // improve with a set
                this.clouds.children = this.clouds.children.filter(c => cloud !== c);
                this.spawnCloud();                
            }
        }
        this.sortColuds() // transparent objects should be sorted! (could be bad for performance)
    }

    sortColuds() {
        this.clouds.children.sort((a, b) => {
            const pt = this.airplane.nodes[0].translation;
            const at = a.nodes[0].translation;
            const bt = b.nodes[0].translation;
            const dist1 = (pt[0]-at[0])*(pt[0]-at[0])+(pt[1]-at[1])*(pt[1]-at[1])+(pt[2]-at[2])*(pt[2]-at[2])
            const dist2 = (pt[0]-bt[0])*(pt[0]-bt[0])+(pt[1]-bt[1])*(pt[1]-bt[1])+(pt[2]-bt[2])*(pt[2]-bt[2]) 
            return dist2 - dist1
        })
    }

    async spawnCloud() {
        const cloudTransparency = Math.max(0.1, Math.random())
        const cloudNumber = Math.floor(Math.random() *  3) + 1;
        await this.loader.load('../res/cloud/cloud_' + cloudNumber + '.gltf');
        const cloud = await this.loader.loadGLTFNodes(this.loader.defaultScene, {
            diffuse : 0.75,
            specular : 0.01,
            shininess : 0.01,
            effect : 1,
            reflectance : 0.01,
            transmittance : 1,
            ior : 1,
            transparency : cloudTransparency,
        });
        this.renderer.prepareGLTFNodes(cloud);
        // this.root.addChild(cloud);
        this.clouds.addChild(cloud);
        // Spawn somewhere from -150 to 150 on x and z axes and from 50 to 75 on y axis
        cloud.nodes[0].translation = [Math.random() * 300 - 150, Math.random() * 25 + 40, Math.random() * 300 - 150];
        // Size between 8 and 12 on x and z axes and from 3 to 6 on y axis
        cloud.nodes[0].scale = [Math.random() * 4 + 8, Math.random() * 3 + 3, Math.random() * 4 + 8];
        // Speed from -2.5 to 2.5 on x and z axes and 0 on y axis
        cloud.nodes[0].velocity = [Math.random() * 5 - 2.5, 0, Math.random() * 5 - 2.5]
        cloud.nodes[0].collidable = false;
        cloud.nodes[0].nodeType = NodeType.CLOUD;
    }
}