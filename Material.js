export class Material {

    constructor() {
        this.texture = null;
        this.envmap = null;
        
        this.diffuse = 1;
        this.specular = 1;
        this.shininess = 50;

        this.effect = 0.6;
        this.reflectance = 0.3;
        this.transmittance = 0.6;
        this.ior = 0.55;
    }

}