//import { Mesh, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer, BoxGeometry, MeshStandardMaterial, Vector3, BufferGeometry, Line, Color, Matrix4, Raycaster } from 'three';

// BOTH 1 and 3 work - individual imports mean no THREE prefix
/* 2 works iff 
    <script type="importmap">
      {
        "imports": {
          "three": "../node_modules/three/build/three.module.js"
        }
      }
    </script>
    is placed in the index.html (which it is)
*/
// import * as THREE necessitates using namespace THREE prefix
//1
//import * as THREE from '../node_modules/three/build/three.module.js';
//2 
//import { Mesh, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer, BoxGeometry, MeshStandardMaterial, Vector3, BufferGeometry, Line, Color, Matrix4, Raycaster } from 'three';
//3
import { Mesh, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer, BoxGeometry, MeshStandardMaterial, Vector3, BufferGeometry, Line, Color, Matrix4, Raycaster } from '../node_modules/three/build/three.module.js';


// works
import { VRButton } from '../node_modules/three/examples/jsm/webxr/VRButton.js';


//problem!!!
// Uncaught TypeError: Failed to resolve module specifier "three/examples/jsm/webxr/XRControllerModelFactory". Relative references must start with either "/", "./", or "../".
import { XRControllerModelFactory } from '../node_modules/three/examples/jsm/webxr/XRControllerModelFactory.js';


const objectUnselectedColor = new Color(0x5853e6);
const objectSelectedColor = new Color(0xf0520a);

class App {
  constructor() {
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 3);
    this.scene = new Scene();
    this.scene.background = new Color(0x505050);
  
    this.renderer = new WebGLRenderer({
        antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
  
    this.initXR();
    this.initScene();
  
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    this.renderer.setAnimationLoop(this.render.bind(this));
  }


  initXR() {
    this.renderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(this.renderer));
    this.controllers = this.buildControllers();

    function onSelectStart() {
      // this refers to the controller
      this.children[0].scale.z = 10;
      this.userData.selectPressed = true;
    }
  
    function onSelectEnd() {
      // this refers to the controller
      this.children[0].scale.z = 0;
      this.userData.selectPressed = false;
    }

    this.controllers.forEach(controller => {
      controller.addEventListener('selectstart', onSelectStart);
      controller.addEventListener('selectend', onSelectEnd);
    });
  }


  initScene() {
    this.objects = [];

    const boxGeometry = new BoxGeometry(0.5, 0.5, 0.5);
    const boxMaterial = new MeshStandardMaterial({ color: objectUnselectedColor });
    const box = new Mesh(boxGeometry, boxMaterial);
    box.position.z = -2;
    this.objects.push(box);
    this.scene.add(box);
  
    const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    this.scene.add(light);
  }


  buildControllers() {
    const controllerModelFactory = new XRControllerModelFactory();
  
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -1)
    ]);
  
    const line = new Line(geometry);
    line.scale.z = 0;
  
    const controllers = [];
  
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      controller.add(line.clone());
      controller.userData.selectPressed = false;
      controller.userData.selectPressedPrev = false;
      this.scene.add(controller);
      controllers.push(controller);

      const grip = this.renderer.xr.getControllerGrip(i);
      grip.add(controllerModelFactory.createControllerModel(grip));
      this.scene.add(grip);
    }

    return controllers;
  }


  handleController(controller) {
    if (controller.userData.selectPressed) {
      if (!controller.userData.selectPressedPrev) {
        // Select pressed
        controller.children[0].scale.z = 10;
        const rotationMatrix = new Matrix4();
        rotationMatrix.extractRotation(controller.matrixWorld);
        const raycaster = new Raycaster();
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotationMatrix);
        const intersects = raycaster.intersectObjects(this.objects);
        if (intersects.length > 0) {
          controller.children[0].scale.z = intersects[0].distance;
          this.selectedObject = intersects[0].object;
          this.selectedObject.material.color = objectSelectedColor;
          this.selectedObjectDistance = this.selectedObject.position.distanceTo(controller.position);
        }
      } else if (this.selectedObject) {
        // Move selected object so it's always the same distance from controller
        const moveVector = controller.getWorldDirection(new Vector3()).multiplyScalar(this.selectedObjectDistance).negate();
        this.selectedObject.position.copy(controller.position.clone().add(moveVector));
      }
    } else if (controller.userData.selectPressedPrev) {
      // Select released
      controller.children[0].scale.z = 10;
      if (this.selectedObject != null) {
        this.selectedObject.material.color = objectUnselectedColor;
        this.selectedObject = null;
      }
    }
    controller.userData.selectPressedPrev = controller.userData.selectPressed;
  }


  render() {
    if (this.controllers) {
      this.controllers.forEach(controller => {
        this.handleController(controller);
      })
    }
  
    this.renderer.render(this.scene, this.camera);
  }


  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.render(this.scene, this.camera); 
  }
}


window.addEventListener('DOMContentLoaded', () => {
  new App();
});
