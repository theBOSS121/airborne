export class CloudController {

    constructor(root, renderer, loader, amountOfCloudsAtStart) {
        this.root = root;
        this.renderer = renderer;
        this.loader = loader;
        this.amountOfCloudsAtStart = amountOfCloudsAtStart;
        this.clouds = [];

    }

    async loadNodes() {
        for (let i = 0; i < this.amountOfCloudsAtStart; i++) await this.spawnCloud();
    }

    update(dt) {   
        for (let cloud of this.clouds) {
            const x = cloud.nodes[0].translation[0];
            const z = cloud.nodes[0].translation[2];
            if (Math.abs(x) > 150 || Math.abs(z) > 150) {
                // improve with a set
                this.clouds = this.clouds.filter(c => cloud !== c);
                this.spawnCloud();
                
            }
        }
    }

    async spawnCloud() {
        const cloudNumber = Math.floor(Math.random() *  3) + 1;
        await this.loader.load('../res/cloud/cloud_' + cloudNumber + '.gltf', {
            diffuse : 0.75,
            specular : 0.01,
            shininess : 0.01,
            effect : 1,
            reflectance : 0.01,
            transmittance : 1,
            ior : 1,
        });
        const cloud = await this.loader.loadGLTFNodes(this.loader.defaultScene);
        this.renderer.prepareGLTFNodes(cloud);
        this.root.addChild(cloud);
        this.clouds.push(cloud);
        // Spawn somewhere from -150 to 150 on x and z axes and from 50 to 75 on y axis
        cloud.nodes[0].translation = [Math.random() * 300 - 150, Math.random() * 15 + 50, Math.random() * 300 - 150];
        // Size between 8 and 12 on x and z axes and from 3 to 6 on y axis
        cloud.nodes[0].scale = [Math.random() * 4 + 8, Math.random() * 3 + 3, Math.random() * 4 + 8];
        // Speed from -1.5 to 1.5 on x and z axes and 0 on y axis
        cloud.nodes[0].velocity = [Math.random() * 3 - 1.5, 0, Math.random() * 3 - 1.5]
    }
}