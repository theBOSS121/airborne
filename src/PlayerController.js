import { mat4, quat, vec3, vec4 } from '../lib/gl-matrix-module.js';
import { app } from './Airborne.js';


// Class that enables Camera control (first/third person view with mouse and wasd[qe])
export class PlayerController {

    constructor(airplaneNode, cameraNode, domElement) {
        
        this.lowFuelAudio = new Audio('../res/audio/low_fuel.mp3');

        // playtime - in miliseconds, if null it will display 0
        this.playtime = null;
        // fuel percentage
        this.fuel = 1;
        this.fuelPerUnits = 0.00125;
        // helps with pausing the game
        this.focusLock = false;
        // The node that this controller controls.
        this.airplaneNode = airplaneNode;
        this.cameraNode = cameraNode;
        // The activation DOM element.
        this.domElement = domElement;
        this.pauseElement = document.querySelector('.pause-container');
        this.fuelElement = document.querySelector('.fuelbar');
        this.speedometerElement = document.querySelector('.speedometer span');
        this.playtimeElement = document.querySelector('.playtime span');
        this.fpsElement = document.querySelector('.fps span');
        this.fuelElement.startWidth = this.fuelElement.offsetWidth;

        this.fps = 69;
        this.frames = 0;
        this.lastTimeFps = 0;

        this.lastTimeSpeed = 0;
        this.avgSpeed = 0;

        this.turningX = 0; // rotate around X axis, when the plane is turning left and right

        // This map is going to hold the pressed state for every key.
        this.keys = {};
        // We are going to use Euler angles for rotation.
        this.eulerRotation = cameraNode.eulerRotation || [0, 0, 0] // rotation around [x, y, z]
        this.cameraNode.rotation = quat.rotateY(this.cameraNode.rotation, this.cameraNode.rotation, - Math.PI / 2);
        this.oldCameraRotation = quat.create();
        this.defaultCameraOffset = [-10, 0, 0];
        this.cameraOffset = [-6, 1.75, 0];

        const correctedTranslationVector = vec3.create();
        vec3.add(correctedTranslationVector, this.airplaneNode.translation, this.cameraOffset);
        this.cameraNode.translation = correctedTranslationVector;

        this.oldTranslationVector = this.cameraOffset;

        // This is going to be a simple decay-based model, where
        // the user input is used as acceleration. The acceleration
        // is used to update velocity, which is in turn used to update
        // translation. If there is no user input, speed will decay.
        // The model needs some limits and parameters.
        // Acceleration in units per second squared.
        this.acceleration = 28;
        this.airdrag = 5;
        // Maximum speed in units per second.
        this.MIN_SPEED = 100;
        this.MAX_SPEED = 250;
        // this.airplaneNode.velocity = [this.MIN_SPEED, 0, 0];
        this.airplaneNode.velocity = [0, 0, 0];
        // Decay as 1 - log percent max speed loss per second.
        this.decay = 0.9935;
        // Pointer sensitivity in radians per pixel.
        this.pointerSensitivity = 0.002;
        this.initHandlers();
        this.oldQRotation = this.cameraNode.rotation;
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

    updateFuel(dt) {
        const speed = vec3.len(this.airplaneNode.velocity); // returns square root of the sum of squares
        this.fuel -= dt * speed * this.fuelPerUnits
        if (this.fuel <= 0) {
            // app.gameOver();
        } else if (this.fuel > 1) {
            this.fuel = 1;
        } else if (this.fuel < 1/4) {
            // if fuel is low
            this.fuelElement.style.backgroundColor = "#ff503c";
            this.lowFuelAudio.play();
        } else {
            this.fuelElement.style.backgroundColor = "#ffc83c";
        }
    }

    updateGUI(dt) {
        this.updateFps(dt);
        this.updateAvgSpeed(dt);
        this.speedometerElement.innerHTML = (this.avgSpeed || 0).toFixed(0);
        this.fuelElement.style.width = `${this.fuelElement.startWidth * this.fuel}px`;
        this.playtimeElement.innerHTML = (this.playtime || 0).toFixed(0);
        this.fpsElement.innerHTML = this.fps.toFixed(0);
    }

    updateAirplane(dt) {
        const slerpValue = Math.exp(-1.5*dt) 
        // translation
        const [w, x, y, z] = vec4.clone([...this.airplaneNode.rotation]);
        const ux = 2 * (x * z - w * y);
        const uy = 2 * (y * z + w * x);
        const uz = 1 - 2 * (x * x + y * y);
        const V = [ux, uy, uz];
        
        const forward = vec3.set(vec3.create(), V[2], V[1], -V[0]);

        const acc = vec3.create();
        if (this.keys['Space']) {
            const wForward = vec3.clone(forward);
            vec3.scale(wForward, forward, 0.4);
            vec3.add(acc, acc, wForward);
        }
        if (this.keys['KeyW']) {
            this.eulerRotation[2] += 0.01;
        } 
        if (this.keys['KeyS']) {
            this.eulerRotation[2] -= 0.01;
        } 
        if (this.keys['KeyA']) {
            if(this.eulerRotation[2] > Math.PI/2 && this.eulerRotation[2] < Math.PI / 2 * 3) {
                this.eulerRotation[1] -= 0.01;
            }else {
                this.eulerRotation[1] += 0.01;
            }
            this.turningX -= 0.125; // rotate the airplane around X axis when turning left and right to simulate real life turning

        } 
        if (this.keys['KeyD']) {
            if(this.eulerRotation[2] > Math.PI/2 && this.eulerRotation[2] < Math.PI / 2 * 3) {
                this.eulerRotation[1] += 0.01;
            }else {
                this.eulerRotation[1] -= 0.01;
            }
            this.turningX += 0.125; // rotate the airplane around X axis when turning left and right to simulate real life turning
        }

        // acceleration
        vec3.add(acc, acc, forward);

        const speed = vec3.len(this.airplaneNode.velocity) * 3.6; // in kmh
        this.airplaneNode.velocity = vec3.scaleAndAdd(vec3.create(), this.airplaneNode.velocity, acc, dt * this.acceleration);
        if (speed > this.MIN_SPEED) this.airplaneNode.velocity = vec3.scale(this.airplaneNode.velocity, this.airplaneNode.velocity, this.decay);
        
        // rotation
        const airplaneRotation = quat.create();
        quat.rotateY(airplaneRotation, airplaneRotation, this.eulerRotation[1]);
        quat.rotateZ(airplaneRotation, airplaneRotation, this.eulerRotation[2]);
        quat.rotateX(airplaneRotation, airplaneRotation, this.turningX)
        quat.slerp(airplaneRotation, airplaneRotation, this.airplaneNode.rotation, slerpValue);
        this.airplaneNode.rotation = airplaneRotation;

        this.turningX /= 1.4; // make the airplane straight - cancel the rotation around X axis
    }

    updateCamera(dt) {
        const lerpValue = Math.exp(-2*dt) 
        const slerpValue = Math.exp(-2*dt) 

        // translation
        const translationVector = vec3.clone(this.defaultCameraOffset);
        vec3.rotateZ(translationVector, translationVector, vec3.clone([0, 0, 0]), this.eulerRotation[2]);
        vec3.rotateY(translationVector, translationVector, vec3.clone([0, 0, 0]), this.eulerRotation[1]);
        vec3.lerp(translationVector, translationVector, this.oldTranslationVector, lerpValue);
        this.oldTranslationVector = translationVector;
        this.cameraOffset = translationVector;

        // moved this to physics
        // const correctedTranslationVector = vec3.create();
        // vec3.add(correctedTranslationVector, this.airplaneNode.translation, translationVector);
        // this.cameraNode.translation = correctedTranslationVector;

        // rotation
        const cameraRotation = quat.create();
        quat.rotateY(cameraRotation, cameraRotation, this.eulerRotation[1]);
        quat.rotateZ(cameraRotation, cameraRotation, this.eulerRotation[2]);
        quat.slerp(cameraRotation, cameraRotation, this.oldCameraRotation, slerpValue);
        this.oldCameraRotation = cameraRotation;

        // correct rotation
        const correctedQuat = quat.create();
        quat.rotateY(correctedQuat, cameraRotation, - Math.PI / 2)
        this.cameraNode.rotation = correctedQuat;
    }

    updateFps(dt) {
        this.frames += 1;
        const timeDelta = this.playtime - this.lastTimeFps;
        if (timeDelta > 0.5) {
            this.fps = this.frames * 2;
            // console.log(this.frames * 5)
            this.frames = 0;
            this.lastTimeFps = this.playtime;
        }
    }

    updateAvgSpeed(dt) {
        const speed = vec3.len(this.airplaneNode.velocity) * 3.6; // returns square root of the sum of squares
        const timeDelta = this.playtime - this.lastTimeSpeed;
        if (timeDelta > 0.15) {
            this.avgSpeed = (this.avgSpeed + speed) / 2;
            this.lastTimeSpeed = this.playtime;
        }
    }

    update(dt) {
        if (!dt) return; // if dt == 0 - means the game is paused, so don't update - look at Applicaton.js _update function
        this.playtime += dt;
        this.updateAirplane(dt);
        this.updateCamera(dt);
        this.updateFuel(dt);
        this.updateGUI(dt);
    }

    pointermoveHandler(e) {
        // Horizontal pointer movement causes camera panning (y-rotation),
        // vertical pointer movement causes camera tilting (x-rotation).
        const dx = Math.min(Math.abs(e.movementX), 5) * Math.sign(e.movementX);
        const dy = Math.min(Math.abs(e.movementY), 10) * Math.sign(e.movementY);
        this.eulerRotation[2] -= dy * this.pointerSensitivity;

        // quat.rotateZ(airplaneRotation, airplaneRotation, this.eulerRotation[2]);
        // quat.slerp(airplaneRotation, airplaneRotation, this.airplaneNode.rotation, slerpValue);
        if(this.eulerRotation[2] > Math.PI/2 && this.eulerRotation[2] < Math.PI / 2 * 3) {
            // this.eulerRotation[1]  += dx * this.pointerSensitivity;
        }else {
            // this.eulerRotation[1]  -= dx * this.pointerSensitivity;
        }
        // Limit pitch so that the camera does not invert on itself.
        // if (this.eulerRotation[0] > Math.PI / 2) this.eulerRotation[0] = Math.PI / 2;
        // if (this.eulerRotation[0] < -Math.PI / 2) this.eulerRotation[0] = -Math.PI / 2;
        // Constrain yaw to the range [0, pi * 2]
        // this.eulerRotation[1] = (this.eulerRotation[1]) % (Math.PI * 2);
        // this.eulerRotation[2] = ((this.eulerRotation[2]) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

        this.lastTimePointerMoveHandler = this.playtime;
    }
    // set this.keys[e.code] when key up/down to true/false
    keydownHandler(e) { this.keys[e.code] = true; }
    keyupHandler(e) { this.keys[e.code] = false; }
}
