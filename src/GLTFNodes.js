// GLTG nodes/objects are wrapped in this class (note that gltf format can have multiple objects/nodes)
export class GLTFNodes {

    constructor(options = {}) {
        this.nodes = [...(options.nodes || [])];
    }
}
