import { vec3, mat4 } from '../lib/gl-matrix-module.js';
import { app } from './Airborne.js';
import { Node, NodeType } from './Node.js';
import { GLTFNodes } from './GLTFNodes.js';
export class Physics {

    constructor(root) {
        this.root = root;

        this.gameOverAudio = new Audio('../res/audio/explosion.mp3');
    }

    update(dt) {
        this.root.traverse(node => {             
            // Move every node with defined velocity
            if (node.velocity) {
                
                node.translation = vec3.scaleAndAdd(node.translation, node.translation, node.velocity, dt);
                node.updateTransformationMatrix();

                if (node.nodeType == NodeType.PLAYER) {
                    app.camera.translation = vec3.add(app.camera.translation, vec3.clone(node.translation), vec3.clone(app.playerController.cameraOffset));
                    app.camera.updateTransformationMatrix();
                }

                // After moving, check for collision with every other node.
                this.root.traverse(other => {
                    if (node !== other && node.collidable && other.collidable) {
                        this.resolveCollision(node, other);
                    }
                });
            }
        });
    }

    intervalIntersection(min1, max1, min2, max2) {
        return !(min1 > max2 || min2 > max1);
    }

    aabbIntersection(aabb1, aabb2) {
        return this.intervalIntersection(aabb1.min[0], aabb1.max[0], aabb2.min[0], aabb2.max[0])
            && this.intervalIntersection(aabb1.min[1], aabb1.max[1], aabb2.min[1], aabb2.max[1])
            && this.intervalIntersection(aabb1.min[2], aabb1.max[2], aabb2.min[2], aabb2.max[2]);
    }

    getTransformedAABB(node) {
        // Transform all vertices of the AABB from local to global space.
        const transform = node.globalMatrix;
        const { min, max } = node.aabb;
        const vertices = [
            [min[0], min[1], min[2]],
            [min[0], min[1], max[2]],
            [min[0], max[1], min[2]],
            [min[0], max[1], max[2]],
            [max[0], min[1], min[2]],
            [max[0], min[1], max[2]],
            [max[0], max[1], min[2]],
            [max[0], max[1], max[2]],
        ].map(v => vec3.transformMat4(v, v, transform));

        // Find new min and max by component.
        const xs = vertices.map(v => v[0]);
        const ys = vertices.map(v => v[1]);
        const zs = vertices.map(v => v[2]);
        const newmin = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
        const newmax = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
        return { min: newmin, max: newmax };
    }

    resolveCollision(a, b, onlyReturnIsColliding) {
        // Get global space AABBs.
        const aBox = this.getTransformedAABB(a);
        const bBox = this.getTransformedAABB(b);

        // Check if there is collision.
        const isColliding = this.aabbIntersection(aBox, bBox);
        if (!isColliding) {
            return false;
        } else {
            if (onlyReturnIsColliding) return true;
            const collisionNodes = [a, b];
            const collisionNodesTypes = collisionNodes.map(n => n.nodeType);
            const fuelSet = [NodeType.PLAYER, NodeType.FUEL];
            if (collisionNodes.every(n => fuelSet.includes(n.nodeType))) {
                if (b.nodeType == NodeType.FUEL) {
                    app.root.traverse(() => {}, (n) => {
                        if (n == b) {
                            app.fuelController.pickedUp(b);
                            return;
                        }
                    });
                    return;
                } 
            } else if (collisionNodesTypes.some(nt => nt == NodeType.PLAYER)) {
                this.gameOverAudio.play();
                app.gameOver();
            }
        }

        // Move node A minimally to avoid collision.
        const diffa = vec3.sub(vec3.create(), bBox.max, aBox.min);
        const diffb = vec3.sub(vec3.create(), aBox.max, bBox.min);

        let minDiff = Infinity;
        let minDirection = [0, 0, 0];
        if (diffa[0] >= 0 && diffa[0] < minDiff) {
            minDiff = diffa[0];
            minDirection = [minDiff, 0, 0];
        }
        if (diffa[1] >= 0 && diffa[1] < minDiff) {
            minDiff = diffa[1];
            minDirection = [0, minDiff, 0];
        }
        if (diffa[2] >= 0 && diffa[2] < minDiff) {
            minDiff = diffa[2];
            minDirection = [0, 0, minDiff];
        }
        if (diffb[0] >= 0 && diffb[0] < minDiff) {
            minDiff = diffb[0];
            minDirection = [-minDiff, 0, 0];
        }
        if (diffb[1] >= 0 && diffb[1] < minDiff) {
            minDiff = diffb[1];
            minDirection = [0, -minDiff, 0];
        }
        if (diffb[2] >= 0 && diffb[2] < minDiff) {
            minDiff = diffb[2];
            minDirection = [0, 0, -minDiff];
        }

        a.translation = [a.translation[0] + minDirection[0],a.translation[1] + minDirection[1],a.translation[2] + minDirection[2]]
        a.transformationMatrixNeedsUpdate = true
    }

}
