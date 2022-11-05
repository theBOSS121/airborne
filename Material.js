// Material of a Node
export class Material {
    
    constructor(envmap = null) {
        this.texture = null;
        this.envmap = envmap;
        
        this.diffuse = 1;
        this.specular = 1;
        this.shininess = 50;

        this.effect = 0.5;
        this.reflectance = 0;
        this.transmittance = 0;
        this.ior = 0.95;
    }

}