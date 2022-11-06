import { quat, vec3, mat4 } from '../lib/gl-matrix-module.js';

// Class that enables Camera control (first/third person view with mouse and wasd[qe])
export class CameraController {

    constructor(node, domElement) {
        // The node that this controller controls.
        this.node = node;
        // The activation DOM element.
        this.domElement = domElement;
        // This map is going to hold the pressed state for every key.
        this.keys = {};
        // We are going to use Euler angles for rotation.
        this.eulerRotation = node.eulerRotation || [0, 0, 0] // rotation around [x, y, z]
        // This is going to be a simple decay-based model, where
        // the user input is used as acceleration. The acceleration
        // is used to update velocity, which is in turn used to update
        // translation. If there is no user input, speed will decay.
        this.velocity = [0, 0, 0];
        // The model needs some limits and parameters.
        // Acceleration in units per second squared.
        this.acceleration = 20;
        // Maximum speed in units per second.
        this.maxSpeed = 10;
        // Decay as 1 - log percent max speed loss per second.
        this.decay = 0.9;
        // Pointer sensitivity in radians per pixel.
        this.pointerSensitivity = 0.002;
        this.initHandlers();
    }

    initHandlers() {
        this.pointermoveHandler = this.pointermoveHandler.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
        this.keyupHandler = this.keyupHandler.bind(this);

        const element = this.domElement;
        const doc = element.ownerDocument;

        doc.addEventListener('keydown', this.keydownHandler);
        doc.addEventListener('keyup', this.keyupHandler);

        element.addEventListener('click', e => element.requestPointerLock());
        doc.addEventListener('pointerlockchange', e => {
            if (doc.pointerLockElement === element) {
                doc.addEventListener('pointermove', this.pointermoveHandler);
            } else {
                doc.removeEventListener('pointermove', this.pointermoveHandler);
            }
        });
    }

    update(dt) {
        if(dt == 0) return
        // a is acceleration, v is speed and x is translation.
        // a = dv/dt
        // v = dx/dt
        // The system can be sufficiently solved with Euler's method:
        // v(t + dt) = v(t) + a(t) * dt
        // x(t + dt) = x(t) + v(t) * dt
        // which can be implemented as
        // v += a * dt
        // x += v * dt

        // Calculate forward, right, up vectors from the y-orientation.
        const cos = Math.cos(this.eulerRotation[1]);
        const sin = Math.sin(this.eulerRotation[1]);
        const forward = [-sin, 0, -cos];
        const right = [cos, 0, -sin];
        const up = [0, 1, 0];
        // Map user input to the acceleration vector.
        const acc = vec3.create();
        if (this.keys['KeyW']) vec3.add(acc, acc, forward);
        if (this.keys['KeyS']) vec3.sub(acc, acc, forward);
        if (this.keys['KeyD']) vec3.add(acc, acc, right);
        if (this.keys['KeyA']) vec3.sub(acc, acc, right);
        if (this.keys['KeyE']) vec3.add(acc, acc, up);
        if (this.keys['KeyQ']) vec3.sub(acc, acc, up);
        // Update velocity based on acceleration (first line of Euler's method).
        vec3.scaleAndAdd(this.velocity, this.velocity, acc, dt * this.acceleration);
        // If there is no user input, apply decay.
        if (!this.keys['KeyW'] && !this.keys['KeyS'] && !this.keys['KeyD'] && !this.keys['KeyA']) {
            const decay = Math.exp(dt * Math.log(1 - this.decay));
            vec3.scale(this.velocity, this.velocity, decay);
        }
        // Limit speed to prevent accelerating to infinity and beyond.
        const speed = vec3.length(this.velocity);
        if (speed > this.maxSpeed) vec3.scale(this.velocity, this.velocity, this.maxSpeed / speed);
        // Update translation based on velocity (second line of Euler's method).
        this.node.translation = vec3.scaleAndAdd(vec3.create(), this.node.translation, this.velocity, dt);

        // Update rotation based on the Euler angles.
        const rotation = quat.create();
        quat.rotateY(rotation, rotation, this.eulerRotation[1]);
        quat.rotateX(rotation, rotation, this.eulerRotation[0]);
        this.node.rotation = rotation;
    }

    pointermoveHandler(e) {
        // Horizontal pointer movement causes camera panning (y-rotation),
        // vertical pointer movement causes camera tilting (x-rotation).
        const dx = e.movementX;
        const dy = e.movementY;
        this.eulerRotation[0] -= dy * this.pointerSensitivity;
        this.eulerRotation[1]  -= dx * this.pointerSensitivity;
        // Limit pitch so that the camera does not invert on itself.
        if (this.eulerRotation[0] > Math.PI / 2) this.eulerRotation[0] = Math.PI / 2;
        if (this.eulerRotation[0] < -Math.PI / 2) this.eulerRotation[0] = -Math.PI / 2;
        // Constrain yaw to the range [0, pi * 2]
        this.eulerRotation[1] = this.eulerRotation[1] % (Math.PI * 2);
    }
    // set this.keys[e.code] when key up/down to true/false
    keydownHandler(e) { this.keys[e.code] = true; }
    keyupHandler(e) { this.keys[e.code] = false; }

}
