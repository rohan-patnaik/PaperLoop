import './style.css';
import * as THREE from 'three';
import { SceneManager } from './game/Scene.js';
import { Car } from './game/Car.js';
import { Stops } from './game/Stops.js';
import { getCarIntent } from './game/input/CarController.js';
import { UI } from './ui/UI.js';
import { papers } from './data/papers.js';
import { validatePapers } from './core/validatePapers.js';

const canvas = document.getElementById('scene-canvas');
const sceneManager = new SceneManager(canvas);
const car = new Car(sceneManager.scene);
car.setPosition(new THREE.Vector3(sceneManager.track.radiusX, 0.35, 0));
const ui = new UI();

const expectedTotal = 30;
const validation = validatePapers(papers, expectedTotal);
const usablePapers = validation.validPapers;
const stops = new Stops(sceneManager.scene, usablePapers, sceneManager.track);

if (!validation.ok) {
  console.group('Reading list data validation');
  validation.errors.forEach((error) => console.error(error.code, error.message, error.details || ''));
  console.groupEnd();
  ui.showToast(`Reading list data issue: ${validation.errors[0]?.message || 'Unknown issue'}`, {
    type: 'error',
    duration: 7000
  });
}

if (usablePapers.length !== expectedTotal) {
  ui.showToast(`Only ${usablePapers.length} of ${expectedTotal} papers loaded.`, {
    type: 'warning',
    duration: 6000
  });
}

const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  brake: false,
  boost: false
};

const resetInput = () => {
  Object.keys(input).forEach((key) => {
    input[key] = false;
  });
};

let controlsEnabled = true;
let nearestStop = null;
ui.dismissFocusHint();

window.addEventListener('keydown', (event) => {
  if (event.code === 'Backquote') {
    ui.toggleDiagnostics();
    return;
  }

  if (event.code === 'KeyE' && !event.repeat) {
    if (ui.isViewerOpen()) {
      ui.closeViewer();
      return;
    }
    if (controlsEnabled && nearestStop) {
      ui.openPaper(nearestStop.paper);
    }
    return;
  }

  if (event.code === 'Escape') {
    if (ui.isViewerOpen()) {
      ui.closeViewer();
      return;
    }
    resetInput();
    return;
  }

  if (!controlsEnabled || ui.isViewerOpen()) {
    return;
  }

  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
      event.code
    )
  ) {
    event.preventDefault();
  }

  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      input.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      input.back = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      input.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      input.right = true;
      break;
    case 'Space':
      input.brake = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      input.boost = true;
      break;
    default:
      break;
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      input.forward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      input.back = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      input.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      input.right = false;
      break;
    case 'Space':
      input.brake = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      input.boost = false;
      break;
    default:
      break;
  }
});

window.addEventListener('blur', () => {
  resetInput();
});

window.addEventListener('resize', () => sceneManager.resize());

const clock = new THREE.Clock();

const tick = () => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  const driveIntent =
    controlsEnabled && !ui.isViewerOpen() ? getCarIntent(input) : getCarIntent();
  car.update(dt, driveIntent);
  sceneManager.updateEnvironment(dt, car.mesh.position);

  const near = stops.getNearestStop(car.mesh.position, 3.2);
  nearestStop = near ? near.stop : null;

  stops.setHighlighted(nearestStop);
  stops.update(elapsed);

  ui.updateInteraction({
    stop: near ? near.paper : null,
    visible: Boolean(near) && controlsEnabled && !ui.isViewerOpen()
  });
  ui.updateHud({
    stop: near ? near.paper : null,
    expectedTotal,
    loadedCount: usablePapers.length
  });
  ui.updateDiagnostics({
    loadedCount: usablePapers.length,
    validationOk: validation.ok,
    nearestStopId: near ? near.paper.id : null,
    speed: car.speed
  });

  sceneManager.updateCamera(car, dt);
  sceneManager.render();

  requestAnimationFrame(tick);
};

tick();

if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  window.__APP__ = {
    openPaperById: (id) => {
      const paper = usablePapers.find((item) => item.id === id);
      if (paper) {
        ui.openPaper(paper);
      } else {
        ui.showToast(`Paper ${id} not available.`, { type: 'error' });
      }
    },
    getValidationResult: () => validation,
    teleportToStop: (id) => {
      const stop = stops.getStopById(id);
      if (!stop) {
        ui.showToast(`Stop ${id} not found.`, { type: 'warning' });
        return;
      }
      const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(stop.group.quaternion);
      car.setPosition(stop.group.position.clone().add(offset));
    },
    getNearestStopId: () => (nearestStop ? nearestStop.paper.id : null)
  };
}
