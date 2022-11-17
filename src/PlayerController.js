import { quat, vec3, vec4 } from '../lib/gl-matrix-module.js';
import { app } from './Airborne.js';

// Class that enables Camera control (first/third person view with mouse and wasd[qe])
export class PlayerController {

    constructor(connectorNode, airplaneNode, cameraNode, domElement) {

        this.ROTATION_INTERPOLATION = 0.9;
        this.CAMERA_DISTANCE_FROM_AIRPLANE = 7;
        // playtime - in miliseconds, if null it will display 0
        this.playtime = null;
        // fuel percentage
        this.fuel = 1;
        this.fuelPerUnits = 0.00125;
        // helps with pausing the game
        this.focusLock = false;
        // The node that this controller controls.
        this.connectorNode = connectorNode;
        this.airplaneNode = airplaneNode;
        this.cameraNode = cameraNode;
        // The activation DOM element.
        this.domElement = domElement;
        this.pauseElement = document.querySelector('.pause-container');
        this.fuelElement = document.querySelector('.fuelbar');
        this.speedometerElement = document.querySelector('.speedometer span');
        this.playtimeElement = document.querySelector('.playtime span');
        this.fuelElement.startWidth = this.fuelElement.offsetWidth;

        // This map is going to hold the pressed state for every key.
        this.keys = {};
        // We are going to use Euler angles for rotation.
        this.eulerRotation = cameraNode.eulerRotation || [0, 0, 0] // rotation around [x, y, z]
        this.cameraNode.rotation = quat.rotateY(this.cameraNode.rotation, this.cameraNode.rotation,  -Math.PI / 2);
        this.cameraNode.translation = [-this.CAMERA_DISTANCE_FROM_AIRPLANE, 0, 0];

        // This is going to be a simple decay-based model, where
        // the user input is used as acceleration. The acceleration
        // is used to update velocity, which is in turn used to update
        // translation. If there is no user input, speed will decay.
        // The model needs some limits and parameters.
        // Acceleration in units per second squared.
        this.acceleration = 55;
        this.airdrag = 5;
        // Maximum speed in units per second.
        this.MIN_SPEED = 5;
        // this.airplaneNode.velocity = [this.MIN_SPEED, 0, 0];
        this.connectorNode.velocity = [0, 0, 0];
        // Decay as 1 - log percent max speed loss per second.
        this.decay = 0.99;
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

        // When left click is pressed on pauseElement the game resumes
        // When ESC button is pressed the game is paused
        this.pauseElement.addEventListener('click', e => element.requestPointerLock());
        doc.addEventListener('pointerlockchange', e => {
            if (doc.pointerLockElement == this.pauseElement || doc.pointerLockElement === element) {
                if (this.focusLock) return;
                // resume the game
                this.focusLock = true;
                doc.addEventListener('pointermove', this.pointermoveHandler);
                app.toggleGameState();
            } else {
                // pause the game
                this.focusLock = false;
                doc.removeEventListener('pointermove', this.pointermoveHandler);
                app.toggleGameState();
            }
        });
    }

    radToDeg(angle) {
        return angle * 180 / Math.PI;
    }

    updateRotation(dt) {
        const rotation = quat.create();
        
        quat.rotateY(rotation, rotation, this.eulerRotation[1]);
        quat.rotateZ(rotation, rotation, this.eulerRotation[2]);
        // quat.rotateX(rotation, rotation, -this.eulerRotation[1]);
        quat.slerp(rotation, this.connectorNode.rotation, rotation, 0.02);

        this.connectorNode.rotation = rotation;




        // this.cameraNode.rotation = camRotation;
    }

    updateTranslation(dt) {
        // get a unit vector that airplane is pointing at - from quaternion
        const [w, x, y, z] = vec4.clone([...this.connectorNode.rotation]);
        const ux = 2 * (x * z - w * y);
        const uy = 2 * (y * z + w * x);
        const uz = 1 - 2 * (x * x + y * y);
        const V = [ux, uy, uz];
        
        const forward = vec3.set(vec3.create(), V[2], V[1], -V[0]);
        const right = vec3.set(vec3.create(), Math.cos(0, 0, 0));

        // 1: add movement acceleration
        const acc = vec3.create();
        // if (this.keys['KeyW']) {
            vec3.add(acc, acc, forward);
        // }
        // if (this.keys['KeyS']) {
        //     vec3.sub(acc, acc, forward);
        // }
        // if (this.keys['KeyD']) {
        //     vec3.add(acc, acc, right);
        // }
        // if (this.keys['KeyA']) {
        //     vec3.sub(acc, acc, right);
        // }

        // 2: update velocity
        this.connectorNode.velocity = vec3.scaleAndAdd(vec3.create(), this.connectorNode.velocity, acc, dt * this.acceleration);

        // 3: if no movement, apply air drag
        // if (!this.keys['KeyW'] && !this.keys['KeyS'] && !this.keys['KeyD'] && !this.keys['KeyA']) {
            this.connectorNode.velocity = vec3.scale(this.connectorNode.velocity, this.connectorNode.velocity, this.decay);
        // }

        // update fuel levels
        this.updateFuel(dt);
    }

    updateFuel(dt) {
        const speed = vec3.len(this.connectorNode.velocity); // returns square root of the sum of squares
        this.fuel -= dt * speed * this.fuelPerUnits
        if (this.fuel <= 0) {
            // app.gameOver();
        } else if (this.fuel > 1) {
            this.fuel = 1;
        }
    }

    updateGUI(dt) {
        // console.log(app.root)
        const speed = vec3.len(this.connectorNode.velocity) * 3.6; // returns square root of the sum of squares
        this.speedometerElement.innerHTML = speed.toFixed(0);
        this.fuelElement.style.width = `${this.fuelElement.startWidth * this.fuel}px`;
        this.playtimeElement.innerHTML = (this.playtime ||0).toFixed(0);
    }

    update(dt) {
        if (!dt) return; // if dt == 0 - means the game is paused, so don't update - look at Applicaton.js _update function
        this.playtime += dt;
        this.updateRotation(dt);
        this.updateTranslation(dt);
        this.updateGUI(dt);
        const r = quat.create();
        quat.rotateY(r, this.cameraNode.rotation, Math.PI/2);
        this.cameraNode.rotation = quat.slerp(this.cameraNode.rotation, r, this.connectorNode.rotation, 0.99);
    }

    pointermoveHandler(e) {
        // Horizontal pointer movement causes camera panning (y-rotation),
        // vertical pointer movement causes camera tilting (x-rotation).
        const dx = e.movementX;
        const dy = e.movementY;
        this.eulerRotation[2] -= dy * this.pointerSensitivity;
        if(this.eulerRotation[2] > Math.PI/2 && this.eulerRotation[2] < Math.PI / 2 * 3) {
            this.eulerRotation[1]  += dx * this.pointerSensitivity;
        }else {
            this.eulerRotation[1]  -= dx * this.pointerSensitivity;
        }
        // Limit pitch so that the camera does not invert on itself.
        // if (this.eulerRotation[0] > Math.PI / 2) this.eulerRotation[0] = Math.PI / 2;
        // if (this.eulerRotation[0] < -Math.PI / 2) this.eulerRotation[0] = -Math.PI / 2;
        // Constrain yaw to the range [0, pi * 2]
        this.eulerRotation[1] = (this.eulerRotation[1]) % (Math.PI * 2);
        this.eulerRotation[2] = ((this.eulerRotation[2]) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    }
    // set this.keys[e.code] when key up/down to true/false
    keydownHandler(e) { this.keys[e.code] = true; }
    keyupHandler(e) { this.keys[e.code] = false; }

}
