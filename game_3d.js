import * as THREE from 'three';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Isometric view
const aspect = window.innerWidth / window.innerHeight;
const d = 20;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(20, 20, 20);
camera.lookAt(scene.position);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 0);
scene.add(dirLight);

// --- GAME OBJECTS ---
const TILE_SIZE = 2;
const MAP_SIZE = 10;
const pathNodes = [
    new THREE.Vector3(-8, 0, -8),
    new THREE.Vector3(-8, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 6),
    new THREE.Vector3(8, 0, 6),
    new THREE.Vector3(8, 0, -8)
];

// Grid (Visual only)
const gridHelper = new THREE.GridHelper(MAP_SIZE * TILE_SIZE, MAP_SIZE, 0x444444, 0x444444);
scene.add(gridHelper);

// Path visual
const pathPoints = pathNodes.map(p => p.clone().add(new THREE.Vector3(0, 0.1, 0))); // Lift slightly
const pathGeom = new THREE.BufferGeometry().setFromPoints(pathPoints);
const pathMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
const pathLine = new THREE.Line(pathGeom, pathMat);
scene.add(pathLine);

// Ground Plane (for raycasting)
const planeGeom = new THREE.PlaneGeometry(40, 40);
const planeMat = new THREE.MeshBasicMaterial({ visible: false });
const groundPlane = new THREE.Mesh(planeGeom, planeMat);
groundPlane.rotation.x = -Math.PI / 2;
scene.add(groundPlane);

const towers = [];
const enemies = [];
const projectiles = [];

// --- LOGIC ---

function spawnEnemy() {
    const geom = new THREE.SphereGeometry(0.6, 16, 16);
    const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geom, mat);

    const start = pathNodes[0];
    mesh.position.copy(start);
    mesh.position.y = 0.6;

    scene.add(mesh);

    enemies.push({
        mesh: mesh,
        nodeIndex: 0,
        hp: 100,
        speed: 0.05,
        active: true
    });
}

function placeTower(x, z) {
    // Snap to grid
    const snapX = Math.round(x / TILE_SIZE) * TILE_SIZE;
    const snapZ = Math.round(z / TILE_SIZE) * TILE_SIZE;

    // Check existing
    if (towers.some(t => t.mesh.position.x === snapX && t.mesh.position.z === snapZ)) return;

    const geom = new THREE.BoxGeometry(1.5, 3, 1.5);
    const mat = new THREE.MeshLambertMaterial({ color: 0x0088ff });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(snapX, 1.5, snapZ);

    scene.add(mesh);

    towers.push({
        mesh: mesh,
        range: 8,
        cooldown: 0,
        maxCooldown: 30
    });
}

// Raycaster for clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(groundPlane);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        placeTower(point.x, point.z);
    }
});

document.getElementById('spawnBtn').addEventListener('click', spawnEnemy);

// --- LOOP ---

function animate() {
    requestAnimationFrame(animate);

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        // Move along path
        if (e.nodeIndex < pathNodes.length - 1) {
            const target = pathNodes[e.nodeIndex + 1];
            const direction = new THREE.Vector3().subVectors(target, e.mesh.position);
            direction.y = 0; // Keep flat

            const dist = direction.length();
            if (dist < e.speed) {
                e.mesh.position.x = target.x;
                e.mesh.position.z = target.z;
                e.nodeIndex++;
            } else {
                direction.normalize();
                e.mesh.position.add(direction.multiplyScalar(e.speed));
            }
        } else {
            // Reached end
            scene.remove(e.mesh);
            enemies.splice(i, 1);
        }
    }

    // Update Towers
    towers.forEach(t => {
        if (t.cooldown > 0) t.cooldown--;

        if (t.cooldown <= 0) {
            // Find target
            let target = null;
            let minDist = t.range;

            for (const e of enemies) {
                const dist = t.mesh.position.distanceTo(e.mesh.position);
                if (dist < minDist) {
                    minDist = dist;
                    target = e;
                }
            }

            if (target) {
                // Shoot (Visual laser)
                const laserGeom = new THREE.BufferGeometry().setFromPoints([
                    t.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
                    target.mesh.position
                ]);
                const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
                const laser = new THREE.Line(laserGeom, laserMat);
                scene.add(laser);

                // Remove laser next frame (super simple)
                setTimeout(() => scene.remove(laser), 100);

                t.cooldown = t.maxCooldown;
            }
        }
    });

    renderer.render(scene, camera);
}

animate();

// Resize handler
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
