/**
 * Daylight 3D Cargo Transport Plane & Skydiver Jump Cutscene Engine
 * Features:
 *  1. Dynamic Randomized Target DZ Relocation on Flat Ground Every Run (Avoiding mountains & river)
 *  2. Strictly Audited Sanok Jungle Terrain (Riverbanks, Rock Formations, Tiered Palm & Canopy Trees)
 *  3. 8 Parachute Suspension Lines connecting a detailed harness to a panelled canopy
 *  4. Circle of 10 Red Smoke Flares surrounding the Sanok DZ Target Landing Site
 *  5. Character Standing Position at Outer Edge of Extended Cargo Ramp Door (Z = -11.5)
 *  6. Initial Idle Screen: Elevated exterior helicopter camera behind the cargo ramp
 *  7. Jump Cutscene: Direct side-profile camera framing the leap out of the cargo ramp
 *  8. Mini-Game: Stable aerial chase camera with head-down dive pose and WASD controls
 */

const IS_STATIC_DEPLOYMENT = Boolean(window.SITE_CONFIG && window.SITE_CONFIG.staticMode);
const STATIC_GUESTBOOK_MESSAGE = 'GitHub Pages 정적 배포에서는 방명록 저장 API를 사용할 수 없습니다.';
const GUESTBOOK_CONFIG = window.GUESTBOOK_CONFIG || {};
const SUPABASE_GUESTBOOK_SETUP_MESSAGE = '방명록 서버 설정이 아직 연결되지 않았습니다.';

let scene, camera, renderer;
let cargoPlane, propellers = [];
let skydiver, parachuteCanopy, parachuteLinesGroup;
let cloudParticles = [], seaOfCloudsGroup, speedLinesGroup;
let jungleIslandTerrain, targetDZGroup, redFlareSmokeParticles = [];
let atmosphereDome, riverSurface;

let altitude = 10000;
let phase = 'IDLE';
let animTime = 0;
let gameStartTime = 0;
let lastFrameTime = 0;
let currentFov = 55;
let visualSteerX = 0;
let visualSteerZ = 0;
let playerVelocity = { x: 0, z: 0 };

// Mini-game Player Controls & Target Settings
const keysPressed = {};
let playerPos = { x: 18.0, z: -25.0 };
const targetDZ = { x: 0.0, z: -50.0, radius: 15.0 };

// Fuselage geometry constants
const FUSE_RADIUS     = 2.5;
const FUSE_LENGTH     = 16;
const FUSE_CENTER_Z   = 0;
const FUSE_FRONT_Z    = FUSE_LENGTH / 2;   // +8
const FUSE_REAR_Z     = -FUSE_LENGTH / 2;  // -8
const INNER_RADIUS    = 2.35;
const FLOOR_Y         = -1.3;

// World constants & Ramp Door Tip Standing Position
const GROUND_Y         = -180;
const SKYDIVER_START_Y = 8.6;   // Standing on extended ramp door tip
const SKYDIVER_START_Z = -11.5; // Outer tip of extended rear cargo ramp door

$(document).ready(function () {
    console.log("🪂 [CLEANED & VERIFIED SANOK SKYDIVE ENGINE] Initializing...");

    init3DCutscene();
    initSectionRevealAnimations();
    initScrollObserver();

    $('#btn-drop').on('click', triggerEject);
    $('#btn-skip-cutscene').on('click', skipCutscene);
    $(document).on('keydown', function (e) {
        keysPressed[e.key.toLowerCase()] = true;
        updateKeyCapsUI();

        if (phase === 'IDLE' && (e.key === 'f' || e.key === 'F' || e.key === ' ')) {
            triggerEject();
        }
    });

    $(document).on('keyup', function (e) {
        keysPressed[e.key.toLowerCase()] = false;
        updateKeyCapsUI();
    });

    loadGuestbook();
    $('#guestbook-form').on('submit', function (e) {
        e.preventDefault();
        submitGuestbook();
    });
});

/* ========================================================
   1. Scene / Camera / Lighting / Renderer
   ======================================================== */
function init3DCutscene() {
    const container = document.getElementById('cutscene-3d-container');
    if (!container) return;

    if (!window.THREE || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        showCutsceneFallback();
        return false;
    }

    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x78bde8);
        scene.fog = new THREE.FogExp2(0xa9d5df, 0.00125);

        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2500);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.82;
        container.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xcfeeff, 0x24451f, 0.78));
        scene.add(new THREE.AmbientLight(0xffffff, 0.22));

        const sun = new THREE.DirectionalLight(0xfff3d6, 1.3);
        sun.position.set(60, 150, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -180;
        sun.shadow.camera.right = 180;
        sun.shadow.camera.top = 180;
        sun.shadow.camera.bottom = -180;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 500;
        sun.shadow.bias = -0.0004;
        scene.add(sun);

        const fill = new THREE.DirectionalLight(0x88bbff, 0.35);
        fill.position.set(0, -20, -50);
        scene.add(fill);

        buildSkyAtmosphere();
        build3DCargoPlane();
        build3DSkydiver();
        buildSeaOfClouds();
        buildRichSanokJungleEnvironment();
        buildSpeedLines();
        buildCloudParticles();

        // Randomize initial flat DZ position
        randomizeFlatDZPosition();

        lastFrameTime = performance.now();
        window.addEventListener('resize', onWindowResize);
        animate3D();
        return true;
    } catch (error) {
        console.error('[CUTSCENE] WebGL intro unavailable:', error);
        showCutsceneFallback();
        return false;
    }
}

function buildSkyAtmosphere() {
    const skyMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
            topColor: { value: new THREE.Color(0x1976c9) },
            horizonColor: { value: new THREE.Color(0xb9e8f2) },
            bottomColor: { value: new THREE.Color(0xe7f5e8) },
            offset: { value: 35.0 },
            exponent: { value: 0.72 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vWorldPosition;
            uniform vec3 topColor;
            uniform vec3 horizonColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            void main() {
                float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
                float upper = pow(max(h, 0.0), exponent);
                float lower = pow(max(-h, 0.0), 0.55);
                vec3 color = mix(horizonColor, topColor, upper);
                color = mix(color, bottomColor, lower * 0.7);
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });
    atmosphereDome = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 20), skyMaterial);
    scene.add(atmosphereDome);

    const sunDisc = new THREE.Mesh(
        new THREE.CircleGeometry(24, 32),
        new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.72, depthWrite: false })
    );
    sunDisc.position.set(-280, 220, -620);
    sunDisc.lookAt(0, 0, 0);
    scene.add(sunDisc);
}

function showCutsceneFallback() {
    $('#cutscene-overlay').hide();
    document.body.classList.add('cutscene-fallback');
}

/* ========================================================
   2. Military Cargo Aircraft Geometry
   ======================================================== */
function build3DCargoPlane() {
    cargoPlane = new THREE.Group();

    const hullMat   = new THREE.MeshStandardMaterial({ color: 0x2a3c2c, roughness: 0.45, metalness: 0.4 });
    const darkMat   = new THREE.MeshStandardMaterial({ color: 0x151f17, roughness: 0.7 });
    const deckMat   = new THREE.MeshStandardMaterial({ color: 0x2e3d30, roughness: 0.8 });
    const innerMat  = new THREE.MeshStandardMaterial({ color: 0x1c2e1f, roughness: 0.65, side: THREE.BackSide });

    // Outer hull
    const outerGeo = new THREE.CylinderGeometry(FUSE_RADIUS, FUSE_RADIUS, FUSE_LENGTH, 28, 1, true);
    const outer = new THREE.Mesh(outerGeo, hullMat);
    outer.rotation.x = Math.PI / 2;
    outer.position.z = FUSE_CENTER_Z;
    outer.castShadow = true;
    outer.receiveShadow = true;
    cargoPlane.add(outer);

    // Inner wall
    const innerGeo = new THREE.CylinderGeometry(INNER_RADIUS, INNER_RADIUS, FUSE_LENGTH, 28, 1, true);
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = Math.PI / 2;
    inner.position.z = FUSE_CENTER_Z;
    cargoPlane.add(inner);

    // Front Bulkhead
    const bhGeo = new THREE.CircleGeometry(INNER_RADIUS, 28);
    const bhMat = new THREE.MeshStandardMaterial({ color: 0x162018 });
    const bhFront = new THREE.Mesh(bhGeo, bhMat);
    bhFront.rotation.y = Math.PI;
    bhFront.position.set(0, 0, FUSE_FRONT_Z - 0.05);
    cargoPlane.add(bhFront);

    const bhBack = new THREE.Mesh(bhGeo, bhMat.clone());
    bhBack.position.set(0, 0, FUSE_FRONT_Z - 0.05);
    cargoPlane.add(bhBack);

    // Nose Cone
    const noseGeo = new THREE.ConeGeometry(FUSE_RADIUS, 4, 28);
    const nose = new THREE.Mesh(noseGeo, hullMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = FUSE_FRONT_Z + 2;
    nose.castShadow = true;
    cargoPlane.add(nose);

    // Cargo Bay Floor Deck
    const floorHalfWidth = Math.sqrt(INNER_RADIUS * INNER_RADIUS - FLOOR_Y * FLOOR_Y);
    const floorGeo = new THREE.BoxGeometry(floorHalfWidth * 2, 0.12, FUSE_LENGTH + 0.5);
    const floor = new THREE.Mesh(floorGeo, deckMat);
    floor.position.set(0, FLOOR_Y, FUSE_CENTER_Z);
    floor.receiveShadow = true;
    cargoPlane.add(floor);

    // Rear Cargo Ramp Door
    const rampLen = 4.5;
    const rampGeo = new THREE.BoxGeometry(floorHalfWidth * 2, 0.12, rampLen);
    const ramp = new THREE.Mesh(rampGeo, deckMat);
    ramp.position.set(0, FLOOR_Y - 0.6, FUSE_REAR_Z - rampLen / 2 + 0.3);
    ramp.rotation.x = -0.25;
    ramp.receiveShadow = true;
    cargoPlane.add(ramp);

    // Ceiling Lights
    [4, 1, -2, -5].forEach(zPos => {
        const pl = new THREE.PointLight(0xff6600, 1.8, 8);
        pl.position.set(0, INNER_RADIUS - 0.6, zPos);
        cargoPlane.add(pl);

        const fix = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.08, 0.5),
            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
        );
        fix.position.set(0, INNER_RADIUS - 0.2, zPos);
        cargoPlane.add(fix);
    });

    // Side Benches
    [-1.6, 1.6].forEach(xPos => {
        const bench = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.08, FUSE_LENGTH - 2),
            new THREE.MeshStandardMaterial({ color: 0x1a2a1e })
        );
        bench.position.set(xPos, FLOOR_Y + 0.5, FUSE_CENTER_Z);
        cargoPlane.add(bench);
    });

    // High Wings
    const wingZ = 2;
    const wingY = FUSE_RADIUS - 0.1;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 3.5), hullMat);
    wing.position.set(0, wingY, wingZ);
    wing.castShadow = true;
    cargoPlane.add(wing);

    // 4 Engines under wings
    [-7, 7, -4, 4].forEach(xOffset => {
        const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.8, 14), darkMat);
        nac.rotation.x = Math.PI / 2;
        nac.position.set(xOffset, wingY - 0.9, wingZ + 0.5);
        nac.castShadow = true;
        cargoPlane.add(nac);

        const propGroup = new THREE.Group();
        for (let i = 0; i < 4; i++) {
            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 2.4, 0.08),
                new THREE.MeshBasicMaterial({ color: 0x0a0a0a })
            );
            blade.rotation.z = (Math.PI / 2) * i;
            propGroup.add(blade);
        }
        propGroup.position.set(xOffset, wingY - 0.9, wingZ + 1.9);
        cargoPlane.add(propGroup);
        propellers.push(propGroup);
    });

    // Vertical Fin
    const finBaseZ = FUSE_REAR_Z + 2;
    const finHeight = 4.5;
    const finSweep = 2.5;

    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(-finSweep, finHeight);
    finShape.lineTo(-finSweep - 1.0, finHeight);
    finShape.lineTo(-2.5, 0);
    finShape.closePath();

    const finExtrudeSettings = { depth: 0.3, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 };
    const finGeo = new THREE.ExtrudeGeometry(finShape, finExtrudeSettings);
    const fin = new THREE.Mesh(finGeo, hullMat);
    fin.rotation.y = Math.PI / 2;
    fin.position.set(0.15, FUSE_RADIUS - 0.1, finBaseZ);
    fin.castShadow = true;
    cargoPlane.add(fin);

    // T-Tail
    const tTailY = FUSE_RADIUS - 0.1 + finHeight;
    const tTailZ = finBaseZ - finSweep;
    const tTail = new THREE.Mesh(new THREE.BoxGeometry(9, 0.22, 2.2), hullMat);
    tTail.position.set(0, tTailY, tTailZ);
    tTail.castShadow = true;
    cargoPlane.add(tTail);

    // Red Navigation Strobe
    const strobeY = tTailY + 0.3;
    const strobeZ = tTailZ;
    const strobeLight = new THREE.PointLight(0xff0000, 1.5, 12);
    strobeLight.position.set(0, strobeY, strobeZ);
    cargoPlane.add(strobeLight);

    const strobeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    strobeMesh.position.set(0, strobeY, strobeZ);
    cargoPlane.add(strobeMesh);
    cargoPlane.userData.strobeLight = strobeLight;
    cargoPlane.userData.strobeMesh = strobeMesh;

    addCargoPlaneDetails(hullMat, darkMat, deckMat, floorHalfWidth, wingY, wingZ);

    cargoPlane.position.set(0, 10, 0);
    scene.add(cargoPlane);
}

function addCargoPlaneDetails(hullMat, darkMat, deckMat, floorHalfWidth, wingY, wingZ) {
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x102c3a,
        roughness: 0.12,
        metalness: 0.2,
        transparent: true,
        opacity: 0.86,
        clearcoat: 0.8
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0b1410, roughness: 0.5, metalness: 0.65 });
    const warningMat = new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.52, emissive: 0x5d3000, emissiveIntensity: 0.18 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 });
    const canvasMat = new THREE.MeshStandardMaterial({ color: 0x314537, roughness: 0.92 });

    // Faceted cockpit glass and armored window frames.
    [-1, 1].forEach(side => {
        const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.5, 0.08), glassMat);
        frontWindow.position.set(side * 0.72, 0.68, FUSE_FRONT_Z + 0.16);
        frontWindow.rotation.z = side * -0.08;
        cargoPlane.add(frontWindow);

        const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.9), glassMat);
        sideWindow.position.set(side * 2.15, 0.58, FUSE_FRONT_Z - 0.55);
        sideWindow.rotation.y = side * 0.18;
        cargoPlane.add(sideWindow);

        const windowGuard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.64, 1.1), frameMat);
        windowGuard.position.set(side * 2.2, 0.58, FUSE_FRONT_Z - 0.55);
        windowGuard.rotation.y = side * 0.18;
        cargoPlane.add(windowGuard);
    });

    // Fuselage panel rings and dorsal antennas.
    [-5.8, -3.1, -0.3, 2.5, 5.2, 7.2].forEach((z, index) => {
        const seam = new THREE.Mesh(
            new THREE.TorusGeometry(FUSE_RADIUS + 0.018, 0.026, 5, 32),
            new THREE.MeshStandardMaterial({ color: index % 2 ? 0x435947 : 0x1a2b20, roughness: 0.55, metalness: 0.45 })
        );
        seam.position.z = z;
        cargoPlane.add(seam);
    });
    [-0.5, 3.8].forEach(z => {
        const antenna = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.7, 5), darkMat);
        antenna.position.set(0, FUSE_RADIUS + 0.34, z);
        cargoPlane.add(antenna);
    });

    // Cargo-bay ribs, floor rails, tie-downs, and canvas bench backs.
    [-6.2, -4.0, -1.8, 0.4, 2.6, 4.8, 6.8].forEach(z => {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(INNER_RADIUS - 0.09, 0.045, 6, 28), frameMat);
        rib.position.z = z;
        cargoPlane.add(rib);
    });
    [-0.82, 0.82].forEach(x => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, FUSE_LENGTH + 4), frameMat);
        rail.position.set(x, FLOOR_Y + 0.09, -1.2);
        cargoPlane.add(rail);
    });
    for (let z = -7; z <= 6; z += 1.7) {
        [-0.82, 0.82].forEach(x => {
            const tieDown = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 10), warningMat);
            tieDown.rotation.x = Math.PI / 2;
            tieDown.position.set(x, FLOOR_Y + 0.15, z);
            cargoPlane.add(tieDown);
        });
    }
    [-1, 1].forEach(side => {
        const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, FUSE_LENGTH - 3), canvasMat);
        backrest.position.set(side * 1.83, FLOOR_Y + 0.88, 0.2);
        backrest.rotation.z = side * -0.12;
        cargoPlane.add(backrest);
    });

    // Hazard markings make the open ramp legible during the jump shot.
    for (let i = -3; i <= 3; i += 1) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.035, 3.2), i % 2 ? warningMat : darkMat);
        stripe.position.set(i * 0.48, FLOOR_Y - 0.48, FUSE_REAR_Z - 2.0);
        stripe.rotation.x = -0.25;
        stripe.rotation.y = 0.45;
        cargoPlane.add(stripe);
    }
    const rampEdge = new THREE.Mesh(new THREE.BoxGeometry(floorHalfWidth * 2 + 0.25, 0.16, 0.22), warningMat);
    rampEdge.position.set(0, FLOOR_Y - 1.12, FUSE_REAR_Z - 4.0);
    rampEdge.rotation.x = -0.25;
    cargoPlane.add(rampEdge);

    // Engine intake rings, propeller hubs, exhausts, and wing panel accents.
    [-7, 7, -4, 4].forEach(xOffset => {
        const intake = new THREE.Mesh(new THREE.TorusGeometry(0.61, 0.09, 8, 20), frameMat);
        intake.position.set(xOffset, wingY - 0.9, wingZ + 1.92);
        cargoPlane.add(intake);

        const hub = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.72, 14), frameMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(xOffset, wingY - 0.9, wingZ + 2.28);
        cargoPlane.add(hub);

        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.72, 10), darkMat);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(xOffset + (xOffset > 0 ? -0.38 : 0.38), wingY - 1.28, wingZ - 0.65);
        cargoPlane.add(exhaust);
    });
    [-10.5, 10.5].forEach(x => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.025, 0.26), darkMat);
        panel.position.set(x, wingY + 0.23, wingZ);
        cargoPlane.add(panel);
    });

    // Wing-tip navigation lights and simple military side roundels.
    [[-15.1, 0xef4444], [15.1, 0x22c55e]].forEach(([x, color]) => {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color }));
        lamp.position.set(x, wingY, wingZ);
        cargoPlane.add(lamp);
        const light = new THREE.PointLight(color, 1.4, 8);
        light.position.copy(lamp.position);
        cargoPlane.add(light);
    });
    [-1, 1].forEach(side => {
        const roundelOuter = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24), new THREE.MeshBasicMaterial({ color: 0xd8e3d6, side: THREE.DoubleSide }));
        roundelOuter.rotation.y = side * Math.PI / 2;
        roundelOuter.position.set(side * (FUSE_RADIUS + 0.02), 0.1, 1.4);
        cargoPlane.add(roundelOuter);
        const roundelInner = new THREE.Mesh(new THREE.CircleGeometry(0.25, 20), new THREE.MeshBasicMaterial({ color: 0x263c2c, side: THREE.DoubleSide }));
        roundelInner.rotation.y = side * Math.PI / 2;
        roundelInner.position.set(side * (FUSE_RADIUS + 0.035), 0.1, 1.4);
        cargoPlane.add(roundelInner);
    });

    // Two red emergency packs inside the cargo bay add depth and scale.
    [-1, 1].forEach(side => {
        const emergencyPack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.2), redMat);
        emergencyPack.position.set(side * 2.05, 0.2, -2.8);
        emergencyPack.rotation.z = side * -0.12;
        cargoPlane.add(emergencyPack);
    });
}

/* ========================================================
   3. Human Skydiver with Parachute Suspension Cords
   ======================================================== */
function build3DSkydiver() {
    skydiver = new THREE.Group();

    const suitMat = new THREE.MeshStandardMaterial({ color: 0xc86416, roughness: 0.62 });
    const suitAccentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x344b38, roughness: 0.82 });
    const webbingMat = new THREE.MeshStandardMaterial({ color: 0x1d2a21, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc78968, roughness: 0.72 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.45), suitMat);
    torso.position.y = 0.5;
    torso.castShadow = true;
    skydiver.add(torso);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.22, 10), skinMat);
    neck.position.y = 1.08;
    skydiver.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 12), skinMat);
    head.scale.set(0.88, 1.05, 0.92);
    head.position.set(0, 1.27, -0.02);
    head.castShadow = true;
    skydiver.add(head);

    // K6-3-inspired "3뚝" helmet: rounded shell, brow, and oversized ear guards.
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.58, metalness: 0.2 });
    const helmetShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.41, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.72),
        helmetMat
    );
    helmetShell.position.y = 1.32;
    helmetShell.castShadow = true;
    skydiver.add(helmetShell);

    const helmetBrow = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.11, 0.2),
        helmetMat
    );
    helmetBrow.position.set(0, 1.5, -0.3);
    helmetBrow.castShadow = true;
    skydiver.add(helmetBrow);

    [-1, 1].forEach(side => {
        const earGuard = new THREE.Mesh(
            new THREE.SphereGeometry(0.24, 14, 10),
            helmetMat
        );
        earGuard.scale.set(0.62, 1.0, 0.58);
        earGuard.position.set(side * 0.3, 1.2, 0.02);
        earGuard.castShadow = true;
        skydiver.add(earGuard);
    });

    const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.15, 0.1),
        new THREE.MeshPhysicalMaterial({ color: 0x16394f, emissive: 0x0a3150, emissiveIntensity: 0.3, roughness: 0.08, metalness: 0.45, clearcoat: 1 })
    );
    visor.position.set(0, 1.32, -0.38);
    skydiver.add(visor);

    const limbMat = new THREE.MeshStandardMaterial({ color: 0x172033, roughness: 0.78 });

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), limbMat);
    armL.position.set(-0.52, 0.6, 0);
    armL.rotation.z = 0.25;
    armL.castShadow = true;
    skydiver.add(armL);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), limbMat);
    armR.position.set(0.52, 0.6, 0);
    armR.rotation.z = -0.25;
    armR.castShadow = true;
    skydiver.add(armR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), limbMat);
    legL.position.set(-0.22, -0.4, 0);
    legL.castShadow = true;
    skydiver.add(legL);

    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), limbMat);
    legR.position.set(0.22, -0.4, 0);
    legR.castShadow = true;
    skydiver.add(legR);

    // Tactical vest, webbing, belt, and utility pouches.
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 0.16), vestMat);
    vest.position.set(0, 0.62, -0.29);
    vest.castShadow = true;
    skydiver.add(vest);

    [-0.25, 0.25].forEach(x => {
        const shoulderStrap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.78, 0.07), webbingMat);
        shoulderStrap.position.set(x, 0.77, -0.39);
        shoulderStrap.rotation.z = x * -0.25;
        skydiver.add(shoulderStrap);
    });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.13, 0.52), webbingMat);
    belt.position.set(0, 0.02, 0);
    skydiver.add(belt);
    [-0.27, 0, 0.27].forEach((x, index) => {
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.12), index === 1 ? suitAccentMat : vestMat);
        pouch.position.set(x, 0.32, -0.39);
        pouch.castShadow = true;
        skydiver.add(pouch);
    });

    // Gloves, reinforced knee pads, and heavy boots.
    [-1, 1].forEach(side => {
        const glove = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), webbingMat);
        glove.position.set(side * 0.62, 0.22, 0);
        skydiver.add(glove);

        const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.25, 0.09), vestMat);
        kneePad.position.set(side * 0.22, -0.43, -0.17);
        skydiver.add(kneePad);

        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.25, 0.42), webbingMat);
        boot.position.set(side * 0.22, -0.88, -0.08);
        boot.castShadow = true;
        skydiver.add(boot);
    });

    const pack = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.75, 0.38),
        new THREE.MeshStandardMaterial({ color: 0x235a83, roughness: 0.68 })
    );
    pack.position.set(0, 0.65, 0.38);
    pack.castShadow = true;
    skydiver.add(pack);

    const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.08), vestMat);
    packFlap.position.set(0, 0.93, 0.6);
    skydiver.add(packFlap);
    [-0.23, 0.23].forEach(x => {
        const packStrap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.055), webbingMat);
        packStrap.position.set(x, 0.64, 0.59);
        skydiver.add(packStrap);
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.07), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8, roughness: 0.3 }));
        buckle.position.set(x, 0.53, 0.63);
        skydiver.add(buckle);
    });

    // Black frying pan strapped vertically to the back.
    const panMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3, metalness: 0.75 });
    const panGroup = new THREE.Group();
    panGroup.position.set(0.18, -0.02, 0.28);
    panGroup.rotation.z = -0.25;

    const panBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.33, 0.36, 0.08, 24),
        panMat
    );
    panBody.rotation.x = Math.PI / 2;
    panBody.position.set(0, 0.5, 0.48);
    panBody.castShadow = true;
    panGroup.add(panBody);

    const panRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.33, 0.045, 8, 24),
        panMat
    );
    panRim.position.set(0, 0.5, 0.53);
    panRim.castShadow = true;
    panGroup.add(panRim);

    const panHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.095, 0.68, 12),
        panMat
    );
    panHandle.position.set(0, 0.98, 0.48);
    panHandle.castShadow = true;
    panGroup.add(panHandle);

    skydiver.add(panGroup);

    // Panelled translucent parachute canopy with alternating fabric sections.
    parachuteCanopy = new THREE.Group();
    const canopyGeo = new THREE.SphereGeometry(4.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const canopyBase = new THREE.Mesh(canopyGeo, new THREE.MeshStandardMaterial({
        color: 0xb91c1c,
        side: THREE.DoubleSide,
        roughness: 0.48,
        transparent: true,
        opacity: 0.82
    }));
    canopyBase.scale.y = 0.58;
    parachuteCanopy.add(canopyBase);
    for (let panel = 0; panel < 8; panel += 1) {
        if (panel % 2 !== 0) continue;
        const panelMesh = new THREE.Mesh(
            new THREE.SphereGeometry(4.535, 3, 12, panel * Math.PI / 4, Math.PI / 4, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: panel % 4 === 0 ? 0xf5e7d0 : 0xe87918, side: THREE.DoubleSide, roughness: 0.58, transparent: true, opacity: 0.88 })
        );
        panelMesh.scale.y = 0.58;
        parachuteCanopy.add(panelMesh);
    }
    const canopyWire = new THREE.Mesh(
        new THREE.SphereGeometry(4.56, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x4b1010, wireframe: true, transparent: true, opacity: 0.24 })
    );
    canopyWire.scale.y = 0.58;
    parachuteCanopy.add(canopyWire);
    parachuteCanopy.position.set(0, 7.2, 0);
    parachuteCanopy.visible = false;
    skydiver.add(parachuteCanopy);

    // 8 suspension lines connect the backpack harness to the canopy rim.
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    parachuteLinesGroup = new THREE.Group();
    Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4;
        return { x: Math.cos(angle) * 3.55, z: Math.sin(angle) * 3.55 };
    }).forEach(pt => {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(pt.x > 0 ? 0.24 : -0.24, 0.65, 0.34),
            new THREE.Vector3(pt.x, 6.7, pt.z)
        ]);
        const line = new THREE.Line(lineGeo, lineMat);
        parachuteLinesGroup.add(line);
    });
    parachuteLinesGroup.visible = false;
    skydiver.add(parachuteLinesGroup);

    skydiver.position.set(0, SKYDIVER_START_Y, SKYDIVER_START_Z);
    scene.add(skydiver);
}

/* ==========================================================
   4. High-Altitude Sea of Clouds
   ========================================================== */
function buildSeaOfClouds() {
    seaOfCloudsGroup = new THREE.Group();

    for (let i = 0; i < 75; i++) {
        const r = 6.0 + Math.random() * 8.0;
        const puffMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 1.0,
            transparent: true,
            opacity: 0.92
        });
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), puffMat);
        const x = (Math.random() - 0.5) * 350;
        const z = (Math.random() - 0.5) * 350;
        const y = -22.0 + (Math.random() - 0.5) * 5.0;
        puff.position.set(x, y, z);
        seaOfCloudsGroup.add(puff);
    }

    scene.add(seaOfCloudsGroup);
}

/* ========================================================
   5. Dynamic 5x Hyper-Speed Wind Streaks
   ======================================================== */
function buildSpeedLines() {
    speedLinesGroup = new THREE.Group();
    const count = 120;
    const lineMat = new THREE.LineBasicMaterial({ color: 0xe6f4ff, transparent: true, opacity: 0.42 });

    for (let i = 0; i < count; i++) {
        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 10.0 + Math.random() * 15.0, 0)
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, lineMat);

        line.position.set(
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 120,
            (Math.random() - 0.5) * 80
        );
        speedLinesGroup.add(line);
    }
    speedLinesGroup.visible = false;
    scene.add(speedLinesGroup);
}

/* =========================================================================
   6. Strictly Audited Sanok Jungle Environment & Dynamic Target DZ Group
   ========================================================================= */
function createJungleGroundTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 256;
    textureCanvas.height = 256;
    const textureContext = textureCanvas.getContext('2d');
    textureContext.fillStyle = '#1e6b38';
    textureContext.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 650; i += 1) {
        const green = 62 + Math.floor(Math.random() * 55);
        const alpha = 0.04 + Math.random() * 0.12;
        textureContext.fillStyle = `rgba(${18 + Math.floor(Math.random() * 28)}, ${green}, ${30 + Math.floor(Math.random() * 32)}, ${alpha})`;
        const size = 1 + Math.random() * 8;
        textureContext.fillRect(Math.random() * 256, Math.random() * 256, size, size * 0.55);
    }

    for (let i = 0; i < 26; i += 1) {
        textureContext.strokeStyle = `rgba(106, 78, 42, ${0.04 + Math.random() * 0.06})`;
        textureContext.lineWidth = 1 + Math.random() * 2;
        textureContext.beginPath();
        textureContext.moveTo(Math.random() * 256, Math.random() * 256);
        textureContext.lineTo(Math.random() * 256, Math.random() * 256);
        textureContext.stroke();
    }

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(18, 18);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
}

function buildRichSanokJungleEnvironment() {
    jungleIslandTerrain = new THREE.Group();

    // 1. Ground Base Plane (Deep Green Jungle Soil)
    const groundTexture = createJungleGroundTexture();
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(600, 600),
        new THREE.MeshStandardMaterial({ color: 0xffffff, map: groundTexture, roughness: 1.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.receiveShadow = true;
    jungleIslandTerrain.add(ground);

    // 2. Sanok River Corridor & Sand Riverbanks
    const riverX = -110;
    const riverWidth = 70;
    
    // Sandy Mud Riverbank Strips
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
    const leftBank = new THREE.Mesh(new THREE.PlaneGeometry(25, 600), bankMat);
    leftBank.rotation.x = -Math.PI / 2;
    leftBank.rotation.z = 0.4;
    leftBank.position.set(riverX - riverWidth/2 - 10, GROUND_Y + 0.1, 0);
    jungleIslandTerrain.add(leftBank);

    const rightBank = new THREE.Mesh(new THREE.PlaneGeometry(25, 600), bankMat);
    rightBank.rotation.x = -Math.PI / 2;
    rightBank.rotation.z = 0.4;
    rightBank.position.set(riverX + riverWidth/2 + 10, GROUND_Y + 0.1, 0);
    jungleIslandTerrain.add(rightBank);

    // Water Surface
    const river = new THREE.Mesh(
        new THREE.PlaneGeometry(riverWidth, 600),
        new THREE.MeshPhysicalMaterial({ color: 0x0a78a0, roughness: 0.12, metalness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.08, transparent: true, opacity: 0.9 })
    );
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = 0.4;
    river.position.set(riverX, GROUND_Y + 0.25, 0);
    jungleIslandTerrain.add(river);
    riverSurface = river;

    // 3. Mountain Hills (Strict Height & Slope Geometry)
    const mountainHills = [
        { x: -180, z: -160, r: 75, h: 65 },
        { x: 190, z: -200, r: 90, h: 80 },
        { x: 200, z: 140, r: 80, h: 70 },
        { x: -200, z: 160, r: 85, h: 72 },
        { x: 0, z: 240, r: 100, h: 90 }
    ];
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.95 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });

    mountainHills.forEach(h => {
        const hill = new THREE.Mesh(new THREE.ConeGeometry(h.r, h.h, 16), hillMat);
        hill.position.set(h.x, GROUND_Y + h.h / 2, h.z);
        hill.castShadow = true;
        hill.receiveShadow = true;
        jungleIslandTerrain.add(hill);

        // Rocky Outcroppings around mountain base
        for (let r = 0; r < 5; r++) {
            const rockAngle = Math.random() * Math.PI * 2;
            const rockDist = h.r * 0.75 + Math.random() * 15;
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(4.0 + Math.random() * 5.0),
                rockMat
            );
            rock.position.set(
                h.x + Math.cos(rockAngle) * rockDist,
                GROUND_Y + 2.0,
                h.z + Math.sin(rockAngle) * rockDist
            );
            jungleIslandTerrain.add(rock);
        }
    });

    // 4. Boot Camp Wooden Huts
    const hutWallMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const hutRoofMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
    [
        { x: 55, z: -30 }, { x: 70, z: -45 }, { x: 45, z: -70 },
        { x: -50, z: -70 }, { x: -70, z: -30 }
    ].forEach(v => {
        const hutGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(10, 6.0, 12), hutWallMat);
        body.position.y = 3.0;
        body.castShadow = true;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(9.0, 5.0, 4), hutRoofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 8.5;
        roof.castShadow = true;
        hutGroup.add(body);
        hutGroup.add(roof);
        const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.16), new THREE.MeshStandardMaterial({ color: 0x27180d, roughness: 0.92 }));
        door.position.set(0, 2.0, 6.08);
        hutGroup.add(door);
        [-2.7, 2.7].forEach(x => {
            const window = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 0.13), new THREE.MeshPhysicalMaterial({ color: 0x173b48, roughness: 0.18, metalness: 0.15, clearcoat: 0.7 }));
            window.position.set(x, 3.8, 6.1);
            hutGroup.add(window);
        });
        hutGroup.userData.isLandingObstacle = true;
        hutGroup.position.set(v.x, GROUND_Y, v.z);
        jungleIslandTerrain.add(hutGroup);
    });

    // 5. Dense Tiered Tropical Jungle Trees (Coconut Palms + Dense Conical Canopy)
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const treeFoliageMats = [
        new THREE.MeshStandardMaterial({ color: 0x124a2a, roughness: 0.86 }),
        new THREE.MeshStandardMaterial({ color: 0x17653a, roughness: 0.82 }),
        new THREE.MeshStandardMaterial({ color: 0x237348, roughness: 0.84 })
    ];
    const palmFoliageMats = [
        new THREE.MeshStandardMaterial({ color: 0x18773e, roughness: 0.68 }),
        new THREE.MeshStandardMaterial({ color: 0x26924c, roughness: 0.66 })
    ];

    for (let i = 0; i < 180; i++) {
        let tx = (Math.random() - 0.5) * 450;
        let tz = (Math.random() - 0.5) * 450;

        if (tx > riverX - 50 && tx < riverX + 50) continue;

        let inMountain = false;
        for (let h of mountainHills) {
            if (Math.hypot(tx - h.x, tz - h.z) < h.r * 0.7) {
                inMountain = true; break;
            }
        }
        if (inMountain) continue;

        const treeGroup = new THREE.Group();
        if (i % 2 === 0) {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, 8.0, 8), treeTrunkMat);
            trunk.position.y = 4.0;
            trunk.castShadow = true;
            const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(5.2 + Math.random() * 1.5, 0), treeFoliageMats[i % treeFoliageMats.length]);
            foliage.scale.set(1.0, 1.35, 1.0);
            foliage.position.y = 10.5;
            foliage.castShadow = true;
            treeGroup.add(trunk);
            treeGroup.add(foliage);
        } else {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 10.0, 8), treeTrunkMat);
            trunk.position.y = 5.0;
            trunk.rotation.z = (Math.random() - 0.5) * 0.15;
            
            for (let p = 0; p < 4; p++) {
                const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 7.2), palmFoliageMats[i % palmFoliageMats.length]);
                leaf.rotation.y = (Math.PI / 2) * p;
                leaf.rotation.x = 0.35;
                leaf.position.set(0, 9.8, 0);
                leaf.castShadow = true;
                treeGroup.add(leaf);
            }
            treeGroup.add(trunk);
        }

        treeGroup.userData.isLandingObstacle = true;
        treeGroup.position.set(tx, GROUND_Y, tz);
        jungleIslandTerrain.add(treeGroup);
    }

    addJungleSetDressing(riverX);

    // -----------------------------------------------------------------------
    // 6. DYNAMIC TARGET DZ GROUP (Relocated on Flat Ground Every Run)
    // -----------------------------------------------------------------------
    targetDZGroup = new THREE.Group();

    // Brown Soil Dirt Patch
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 });
    const patchGeo = new THREE.CircleGeometry(targetDZ.radius + 6.0, 32);
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.y = 0.05;
    targetDZGroup.add(patch);

    // PUBG Air-Drop Care Package Crates
    [
        { x: -6.0, z: 4.0 },
        { x: 8.0, z: -5.0 }
    ].forEach(cratePos => {
        const crateGroup = new THREE.Group();
        const crateBox = new THREE.Mesh(
            new THREE.BoxGeometry(4.0, 3.5, 4.0),
            new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
        );
        crateBox.position.y = 1.75;
        crateBox.castShadow = true;
        crateGroup.add(crateBox);

        const tarp = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.6, 4.2),
            new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 })
        );
        tarp.position.y = 3.6;
        crateGroup.add(tarp);

        [-1.15, 1.15].forEach(x => {
            const strap = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 4.25, 4.08),
                new THREE.MeshStandardMaterial({ color: 0x202a31, roughness: 0.72, metalness: 0.25 })
            );
            strap.position.set(x, 1.95, 0);
            crateGroup.add(strap);
        });

        crateGroup.position.set(cratePos.x, 0, cratePos.z);
        targetDZGroup.add(crateGroup);
    });

    // Target DZ Ring & Center Discs
    const targetDZMesh = new THREE.Mesh(
        new THREE.RingGeometry(targetDZ.radius - 1.2, targetDZ.radius, 32),
        new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
    );
    targetDZMesh.rotation.x = -Math.PI / 2;
    targetDZMesh.position.y = 0.2;
    targetDZGroup.add(targetDZMesh);

    const innerDisc = new THREE.Mesh(
        new THREE.CircleGeometry(targetDZ.radius - 1.2, 32),
        new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    innerDisc.rotation.x = -Math.PI / 2;
    innerDisc.position.y = 0.15;
    targetDZGroup.add(innerDisc);

    const centerDisc = new THREE.Mesh(
        new THREE.CircleGeometry(3.2, 32),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
    );
    centerDisc.rotation.x = -Math.PI / 2;
    centerDisc.position.y = 0.3;
    targetDZGroup.add(centerDisc);

    // Deep Beacon Light
    const beaconLight = new THREE.PointLight(0x10b981, 8.0, 90);
    beaconLight.position.set(0, 20, 0);
    targetDZGroup.add(beaconLight);

    // Circle of 10 Red Smoke Flares
    const flareCount = 10;
    const flareCanisterMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const flareTipMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    redFlareSmokeParticles = [];

    for (let i = 0; i < flareCount; i++) {
        const flareAngle = (Math.PI * 2 / flareCount) * i;
        const fx = Math.cos(flareAngle) * targetDZ.radius;
        const fz = Math.sin(flareAngle) * targetDZ.radius;

        const flareGroup = new THREE.Group();

        const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.4, 12), flareCanisterMat);
        canister.position.y = 0.7;
        canister.castShadow = true;
        flareGroup.add(canister);

        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), flareTipMat);
        tip.position.y = 1.35;
        flareGroup.add(tip);

        const flareLight = new THREE.PointLight(0xff2200, 3.5, 25);
        flareLight.position.set(0, 1.8, 0);
        flareGroup.add(flareLight);

        for (let j = 0; j < 5; j++) {
            const smokePuffMat = new THREE.MeshStandardMaterial({
                color: 0xef4444,
                transparent: true,
                opacity: 0.55 - j * 0.08,
                roughness: 1.0
            });
            const smokePuff = new THREE.Mesh(
                new THREE.SphereGeometry(1.2 + j * 0.4, 10, 10),
                smokePuffMat
            );
            smokePuff.position.set(
                (Math.random() - 0.5) * 0.8,
                2.0 + j * 2.2,
                (Math.random() - 0.5) * 0.8
            );
            flareGroup.add(smokePuff);
            redFlareSmokeParticles.push({
                mesh: smokePuff,
                baseY: 2.0 + j * 2.2,
                speed: 0.6 + Math.random() * 0.4
            });
        }

        flareGroup.position.set(fx, 0, fz);
        targetDZGroup.add(flareGroup);
    }

    targetDZGroup.position.set(targetDZ.x, GROUND_Y, targetDZ.z);
    jungleIslandTerrain.add(targetDZGroup);

    addLandingZoneDetails();

    scene.add(jungleIslandTerrain);
}

function addJungleSetDressing(riverX) {
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x795334, roughness: 1, transparent: true, opacity: 0.92 });
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x477a3c, roughness: 0.85 });
    const shrubMats = [
        new THREE.MeshStandardMaterial({ color: 0x1c6b37, roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ color: 0x2d7c3f, roughness: 0.9 })
    ];
    const weatheredWood = new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.94 });
    const corrugatedMetal = new THREE.MeshStandardMaterial({ color: 0x54625b, roughness: 0.68, metalness: 0.35 });

    // Crossing dirt tracks visually connect the huts and landing clearings.
    [
        { x: 25, z: -30, w: 15, h: 230, r: 0.22 },
        { x: -5, z: -20, w: 12, h: 190, r: Math.PI / 2 - 0.13 },
        { x: 105, z: 80, w: 10, h: 130, r: -0.55 }
    ].forEach(path => {
        const track = new THREE.Mesh(new THREE.PlaneGeometry(path.w, path.h), dirtMat);
        track.rotation.x = -Math.PI / 2;
        track.rotation.z = path.r;
        track.position.set(path.x, GROUND_Y + 0.32, path.z);
        track.receiveShadow = true;
        jungleIslandTerrain.add(track);
    });

    // Timber bridge and guard rails across the river corridor.
    const bridge = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(88, 1.1, 9), weatheredWood);
    deck.position.y = 1.0;
    deck.castShadow = true;
    bridge.add(deck);
    for (let x = -40; x <= 40; x += 5) {
        const plankSeam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 8.8), corrugatedMetal);
        plankSeam.position.set(x, 1.58, 0);
        bridge.add(plankSeam);
    }
    [-1, 1].forEach(side => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(88, 0.18, 0.18), corrugatedMetal);
        rail.position.set(0, 2.3, side * 4.15);
        bridge.add(rail);
        for (let x = -42; x <= 42; x += 7) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), corrugatedMetal);
            post.position.set(x, 1.75, side * 4.15);
            bridge.add(post);
        }
    });
    bridge.position.set(riverX, GROUND_Y, 18);
    bridge.rotation.y = -0.4;
    jungleIslandTerrain.add(bridge);

    // Watchtowers give the boot-camp silhouette a readable landmark.
    [{ x: 92, z: -28 }, { x: -24, z: -96 }].forEach(position => {
        const tower = new THREE.Group();
        [-1, 1].forEach(x => [-1, 1].forEach(z => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 10, 0.45), weatheredWood);
            leg.position.set(x * 2.1, 5, z * 2.1);
            leg.rotation.z = x * 0.035;
            tower.add(leg);
        }));
        const platform = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 5.4), weatheredWood);
        platform.position.y = 10;
        tower.add(platform);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.4, 4.5), weatheredWood);
        cabin.position.y = 12;
        tower.add(cabin);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 2.1, 4), corrugatedMetal);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 14.7;
        tower.add(roof);
        tower.userData.isLandingObstacle = true;
        tower.position.set(position.x, GROUND_Y, position.z);
        jungleIslandTerrain.add(tower);
    });

    // Cheap low-poly undergrowth fills the otherwise empty forest floor.
    for (let i = 0; i < 90; i += 1) {
        const x = (Math.random() - 0.5) * 440;
        const z = (Math.random() - 0.5) * 440;
        if (x > riverX - 52 && x < riverX + 52) continue;
        const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3 + Math.random() * 1.7, 0), shrubMats[i % shrubMats.length]);
        shrub.scale.y = 0.65 + Math.random() * 0.45;
        shrub.position.set(x, GROUND_Y + 1.1, z);
        shrub.rotation.y = Math.random() * Math.PI;
        shrub.userData.isLandingObstacle = true;
        jungleIslandTerrain.add(shrub);
    }

    // Bamboo clusters punctuate the riverbank.
    for (let cluster = 0; cluster < 12; cluster += 1) {
        const group = new THREE.Group();
        for (let stalk = 0; stalk < 5; stalk += 1) {
            const height = 7 + Math.random() * 7;
            const bamboo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, height, 6), bambooMat);
            bamboo.position.set((Math.random() - 0.5) * 2.3, height / 2, (Math.random() - 0.5) * 2.3);
            bamboo.rotation.z = (Math.random() - 0.5) * 0.1;
            group.add(bamboo);
        }
        group.position.set(riverX + (cluster % 2 ? 49 : -49), GROUND_Y, -220 + cluster * 38);
        group.userData.isLandingObstacle = true;
        jungleIslandTerrain.add(group);
    }
}

function addLandingZoneDetails() {
    if (!targetDZGroup) return;
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.4, emissive: 0x60a5fa, emissiveIntensity: 0.55 });
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x8a7654, roughness: 1 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x27333b, roughness: 0.5, metalness: 0.65 });
    const tarpMat = new THREE.MeshStandardMaterial({ color: 0x285b8b, roughness: 0.76, side: THREE.DoubleSide });

    // White H marker and radial approach chevrons.
    [
        { x: -1.25, z: 0, w: 0.65, h: 5.4 },
        { x: 1.25, z: 0, w: 0.65, h: 5.4 },
        { x: 0, z: 0, w: 3.1, h: 0.65 }
    ].forEach(part => {
        const marker = new THREE.Mesh(new THREE.PlaneGeometry(part.w, part.h), markerMat);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(part.x, 0.36, part.z);
        targetDZGroup.add(marker);
    });
    for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI / 4;
        const chevron = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3.4), markerMat);
        chevron.rotation.x = -Math.PI / 2;
        chevron.rotation.z = -angle;
        chevron.position.set(Math.cos(angle) * (targetDZ.radius + 4.2), 0.35, Math.sin(angle) * (targetDZ.radius + 4.2));
        targetDZGroup.add(chevron);
    }

    // Sandbag arcs protect the equipment without obscuring the target.
    [-1, 1].forEach(side => {
        for (let i = -3; i <= 3; i += 1) {
            const bag = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 6), sandbagMat);
            bag.scale.set(1.45, 0.55, 0.72);
            bag.position.set(side * 12.3, 0.62, i * 1.45);
            bag.rotation.y = Math.PI / 2;
            bag.castShadow = true;
            targetDZGroup.add(bag);
        }
    });

    // Four portable floodlights make the target readable from altitude.
    [[-11, -11], [11, -11], [-11, 11], [11, 11]].forEach(([x, z]) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 4.8, 8), poleMat);
        pole.position.set(x, 2.4, z);
        targetDZGroup.add(pole);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.46, 0.3), lightMat);
        lamp.position.set(x, 4.8, z);
        lamp.lookAt(0, 0, 0);
        targetDZGroup.add(lamp);
        const point = new THREE.PointLight(0x8fd7ff, 2.1, 25);
        point.position.set(x, 4.6, z);
        targetDZGroup.add(point);
    });

    // A compact command tent and pallet stack establish scale around the DZ.
    const tent = new THREE.Group();
    const tentRoof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 3.0, 4), tarpMat);
    tentRoof.rotation.y = Math.PI / 4;
    tentRoof.scale.z = 0.72;
    tentRoof.position.y = 3.8;
    tent.add(tentRoof);
    [-1, 1].forEach(x => [-1, 1].forEach(z => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 6), poleMat);
        leg.position.set(x * 3.2, 1.8, z * 2.2);
        tent.add(leg);
    }));
    tent.position.set(-22, 0, 4);
    targetDZGroup.add(tent);

    for (let stack = 0; stack < 3; stack += 1) {
        const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 2.2), new THREE.MeshStandardMaterial({ color: 0x76522d, roughness: 0.9 }));
        pallet.position.set(20 + (stack % 2) * 2.8, 0.7 + Math.floor(stack / 2) * 1.45, -5 + (stack % 2) * 1.2);
        pallet.castShadow = true;
        targetDZGroup.add(pallet);
    }

    // Windsock points toward the jungle and adds motion-free directional detail.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 7.5, 8), poleMat);
    mast.position.set(21, 3.75, 12);
    targetDZGroup.add(mast);
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.65, 4.2, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xf97316, side: THREE.DoubleSide, roughness: 0.72 }));
    sock.rotation.z = -Math.PI / 2;
    sock.position.set(18.9, 7.1, 12);
    targetDZGroup.add(sock);

    // Outer pulse ring is animated in the main loop.
    const pulseRing = new THREE.Mesh(
        new THREE.RingGeometry(targetDZ.radius + 2.2, targetDZ.radius + 2.7, 48),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
    );
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.position.y = 0.26;
    targetDZGroup.add(pulseRing);
    targetDZGroup.userData.pulseRing = pulseRing;
}

function updateLandingClearing() {
    if (!jungleIslandTerrain) return;
    const safeRadius = targetDZ.radius + 18;
    jungleIslandTerrain.children.forEach(child => {
        if (!child.userData.isLandingObstacle) return;
        child.visible = Math.hypot(child.position.x - targetDZ.x, child.position.z - targetDZ.z) > safeRadius;
    });
}

/* =========================================================================
   7. Dynamic Flat Ground Target DZ Relocation Function
   ========================================================================= */
function randomizeFlatDZPosition() {
    const mountainHills = [
        { x: -180, z: -160, r: 75 },
        { x: 190, z: -200, r: 90 },
        { x: 200, z: 140, r: 80 },
        { x: -200, z: 160, r: 85 },
        { x: 0, z: 240, r: 100 }
    ];
    const riverX = -110;
    const riverWidth = 80;

    let valid = false;
    let rx = 0, rz = 0;
    let attempts = 0;

    while (!valid && attempts < 300) {
        attempts++;
        rx = (Math.random() - 0.5) * 260;
        rz = (Math.random() - 0.5) * 240;

        if (rx > riverX - riverWidth/2 - 20 && rx < riverX + riverWidth/2 + 20) continue;

        let hitMountain = false;
        for (let h of mountainHills) {
            if (Math.hypot(rx - h.x, rz - h.z) < h.r + targetDZ.radius + 15.0) {
                hitMountain = true;
                break;
            }
        }
        if (hitMountain) continue;

        valid = true;
    }

    if (valid) {
        targetDZ.x = rx;
        targetDZ.z = rz;
        if (targetDZGroup) {
            targetDZGroup.position.set(targetDZ.x, GROUND_Y, targetDZ.z);
        }
        updateLandingClearing();
        console.log(`🎯 [TARGET DZ RELOCATED TO FLAT TERRAIN] X: ${rx.toFixed(1)}, Z: ${rz.toFixed(1)}`);
    }
}

/* ========================================================
   8. Cloud Particles
   ======================================================== */
function buildCloudParticles() {
    const count = 400;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
        positions[i]     = (Math.random() - 0.5) * 350;
        positions[i + 1] = (Math.random() - 0.5) * 200;
        positions[i + 2] = (Math.random() - 0.5) * 350;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ size: 3.0, color: 0xffffff, transparent: true, opacity: 0.55 });
    const cloud = new THREE.Points(geo, mat);
    scene.add(cloud);
    cloudParticles.push(cloud);
}

/* ========================================================
   9. Trigger Eject (Start WASD Mini-Game)
   ======================================================== */
function triggerEject() {
    if (phase !== 'IDLE' || !scene || !skydiver) return;
    
    randomizeFlatDZPosition();

    phase = 'JUMPING';
    gameStartTime = Date.now();
    playerPos = { x: targetDZ.x + 18.0, z: targetDZ.z + 25.0 };
    visualSteerX = 0;
    visualSteerZ = 0;
    playerVelocity = { x: 0, z: 0 };

    console.log("🪂 LEAPING FROM CARGO RAMP DOOR TIP!");

    $('#cutscene-ui-box').fadeOut(300);
    $('#minigame-hud').fadeIn(400);
}

/* =========================================================================
   10. Animation Loop – Red Flare Smoke & Parachute Lines Synchronized
   ========================================================================= */
function animate3D() {
    requestAnimationFrame(animate3D);

    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000.0, 0.05);
    lastFrameTime = now;
    animTime += dt;

    propellers.forEach(p => p.rotation.z += 16 * dt);

    if (cargoPlane?.userData.strobeLight) {
        const flash = Math.pow(Math.max(0, Math.sin(animTime * 5.4)), 18);
        cargoPlane.userData.strobeLight.intensity = 0.18 + flash * 5.5;
        cargoPlane.userData.strobeMesh.scale.setScalar(0.85 + flash * 1.8);
    }

    if (riverSurface) {
        riverSurface.material.opacity = 0.86 + Math.sin(animTime * 0.65) * 0.035;
    }

    if (targetDZGroup?.userData.pulseRing) {
        const pulse = 1 + (Math.sin(animTime * 2.2) + 1) * 0.06;
        targetDZGroup.userData.pulseRing.scale.set(pulse, pulse, 1);
        targetDZGroup.userData.pulseRing.material.opacity = 0.2 + (Math.sin(animTime * 2.2) + 1) * 0.09;
    }

    // Gently drift cloud particles
    if (cloudParticles.length > 0) {
        cloudParticles[0].rotation.y += 0.03 * dt;
    }

    // Animate Red Smoke Flare Wafting Particles
    redFlareSmokeParticles.forEach(p => {
        p.mesh.position.y += p.speed * dt * 2.0;
        p.mesh.position.x += Math.sin(animTime * 2.0 + p.baseY) * 0.04;
        if (p.mesh.position.y > p.baseY + 5.0) {
            p.mesh.position.y = p.baseY;
        }
    });

    if (phase === 'IDLE') {
        cargoPlane.position.y = 10 + Math.sin(animTime * 0.5) * 0.15;
        skydiver.position.y = cargoPlane.position.y - 1.4;
        skydiver.position.z = SKYDIVER_START_Z;
        skydiver.rotation.y = Math.sin(animTime * 0.42) * 0.035;

        seaOfCloudsGroup.visible = true;
        speedLinesGroup.visible = false;

        if (Math.abs(currentFov - 55) > 0.1) {
            currentFov = 55;
            camera.fov = currentFov;
            camera.updateProjectionMatrix();
        }

        const tx = skydiver.position.x;
        const ty = skydiver.position.y + 0.4;
        const tz = skydiver.position.z;

        // Helicopter-style establishing shot from the safe exterior of the open ramp.
        // The Z limit keeps the camera behind the fuselage even at the widest sweep.
        const heliSweep = Math.sin(animTime * 0.22) * 0.30;
        const heliRadius = 9.4;
        const safeRearZ = FUSE_REAR_Z - 6.3;

        camera.position.x = tx + Math.sin(heliSweep) * heliRadius;
        camera.position.z = Math.min(tz - Math.cos(heliSweep) * heliRadius, safeRearZ);
        camera.position.y = ty + 6.4 + Math.sin(animTime * 0.30) * 0.18;
        camera.lookAt(tx, ty - 0.1, tz + 0.45);
    }
    else if (phase === 'JUMPING') {
        const elapsed = (Date.now() - gameStartTime) / 1000.0;

        const jumpProgress = Math.min(1, elapsed / 1.0);
        skydiver.position.z = SKYDIVER_START_Z - jumpProgress * 6.0;
        skydiver.position.y = (cargoPlane.position.y - 1.4) - jumpProgress * 3.0;
        const diveEase = jumpProgress * jumpProgress * (3 - 2 * jumpProgress);
        skydiver.rotation.x = -diveEase * Math.PI * 0.84;
        skydiver.rotation.y = 0;
        skydiver.rotation.z = -Math.sin(jumpProgress * Math.PI) * 0.12;

        camera.position.set(8.5, skydiver.position.y + 1.2, skydiver.position.z + 1.5);
        camera.lookAt(skydiver.position.x, skydiver.position.y + 0.5, skydiver.position.z);

        if (elapsed >= 1.0) {
            phase = 'MINIGAME';
            gameStartTime = Date.now();
        }
    }
    else if (phase === 'MINIGAME') {
        const elapsed = (Date.now() - gameStartTime) / 1000.0;
        const FREEFALL_TIME = 5.0;      // 5.0s rapid freefall right after leap (10,000m -> 2,000m)
        const PARACHUTE_TIME = 3.0;     // 3.0s parachute descent slowly landing (2,000m -> 0m)
        const TOTAL_TIME = FREEFALL_TIME + PARACHUTE_TIME; // 8.0s total

        const timeLeft = Math.max(0, TOTAL_TIME - elapsed);

        // Piecewise Distance & Altitude Calculation:
        //  - Phase 1 (0.0s ~ 5.0s): 5 seconds freefall covering 80% distance (10,000m -> 2,000m)
        //  - Phase 2 (5.0s ~ 8.0s): 3 seconds parachute descent covering remaining 20% distance (2,000m -> 0m)
        let dropProgress = 0;
        if (elapsed < FREEFALL_TIME) {
            dropProgress = (elapsed / FREEFALL_TIME) * 0.8;
            altitude = Math.max(2000, Math.round(10000 - (elapsed / FREEFALL_TIME) * 8000));
        } else {
            const pTime = Math.min(PARACHUTE_TIME, elapsed - FREEFALL_TIME);
            dropProgress = 0.8 + (pTime / PARACHUTE_TIME) * 0.2;
            altitude = Math.max(0, Math.round(2000 - (pTime / PARACHUTE_TIME) * 2000));
        }
        $('#hud-timer').text(timeLeft.toFixed(1) + ' s');

        // Cloud Punch Transition (0 ~ 1.8s)
        if (elapsed < 1.8) {
            seaOfCloudsGroup.position.y += 80 * dt;
            const fadeOpacity = Math.max(0, 0.95 - elapsed * 0.52);
            seaOfCloudsGroup.children.forEach(c => { c.material.opacity = fadeOpacity; });
        } else {
            seaOfCloudsGroup.visible = false;
        }

        // Speed Lines & FOV Kick during 5s Freefall (0 ~ 5.0s)
        let targetFov = 55;
        if (elapsed < FREEFALL_TIME) {
            speedLinesGroup.visible = true;
            speedLinesGroup.children.forEach(l => {
                l.position.y += 400 * dt;
                if (l.position.y > 60) l.position.y = -60;
            });
            speedLinesGroup.position.x = skydiver.position.x;
            speedLinesGroup.position.z = skydiver.position.z;
            targetFov = 74;
        } else {
            speedLinesGroup.visible = false;
            targetFov = 55;
        }

        currentFov = THREE.MathUtils.lerp(currentFov, targetFov, 5.0 * dt);
        camera.fov = currentFov;
        camera.updateProjectionMatrix();

        // WASD steering uses acceleration/deceleration instead of abrupt position jumps.
        const steerX = (keysPressed['d'] ? 1 : 0) - (keysPressed['a'] ? 1 : 0);
        const steerZ = (keysPressed['s'] ? 1 : 0) - (keysPressed['w'] ? 1 : 0);
        const inputLength = Math.hypot(steerX, steerZ) || 1;
        const targetVelocityX = (steerX / inputLength) * 38.0;
        const targetVelocityZ = (steerZ / inputLength) * 38.0;
        const movementBlend = 1 - Math.exp(-8 * dt);
        playerVelocity.x = THREE.MathUtils.lerp(playerVelocity.x, targetVelocityX, movementBlend);
        playerVelocity.z = THREE.MathUtils.lerp(playerVelocity.z, targetVelocityZ, movementBlend);
        playerPos.x += playerVelocity.x * dt;
        playerPos.z += playerVelocity.z * dt;

        const steerBlend = 1 - Math.exp(-5 * dt);
        visualSteerX = THREE.MathUtils.lerp(visualSteerX, steerX, steerBlend);
        visualSteerZ = THREE.MathUtils.lerp(visualSteerZ, steerZ, steerBlend);

        skydiver.position.x = playerPos.x;
        skydiver.position.z = playerPos.z;

        const dropStart = 5.6;
        skydiver.position.y = dropStart - Math.min(1.0, dropProgress) * (dropStart - GROUND_Y);

        // Parachute opens at 5.0s (after 5s freefall), then 3s slow descent until landing at 8.0s
        if (elapsed >= FREEFALL_TIME) {
            parachuteCanopy.visible = true;
            if (parachuteLinesGroup) parachuteLinesGroup.visible = true;
            const deploy = Math.min(1, (elapsed - FREEFALL_TIME) / 0.38);
            const easedDeploy = 1 - Math.pow(1 - deploy, 3);
            parachuteCanopy.scale.set(0.76 + easedDeploy * 0.24, Math.max(0.04, easedDeploy), 0.76 + easedDeploy * 0.24);
            parachuteCanopy.rotation.z = Math.sin(animTime * 1.4) * 0.025;
            if (parachuteLinesGroup) parachuteLinesGroup.scale.set(0.72 + easedDeploy * 0.28, Math.max(0.08, easedDeploy), 0.72 + easedDeploy * 0.28);
            skydiver.rotation.x = THREE.MathUtils.lerp(-Math.PI * 0.84, 0, easedDeploy);
            skydiver.rotation.y = visualSteerX * 0.04;
            skydiver.rotation.z = -visualSteerX * 0.07 + Math.sin(animTime * 1.4) * 0.012;
        } else {
            parachuteCanopy.visible = false;
            if (parachuteLinesGroup) parachuteLinesGroup.visible = false;
            parachuteCanopy.scale.set(1, 1, 1);
            if (parachuteLinesGroup) parachuteLinesGroup.scale.set(1, 1, 1);
            // Hold a controlled head-down dive. Steering banks the body without
            // introducing the previous continuous Y-axis spin.
            skydiver.rotation.x = -Math.PI * 0.84 + visualSteerZ * 0.04 + Math.sin(animTime * 2.3) * 0.012;
            skydiver.rotation.y = visualSteerX * 0.06;
            skydiver.rotation.z = -visualSteerX * 0.12 + Math.sin(animTime * 1.7) * 0.018;
        }

        // Smooth aerial chase: an oblique view preserves speed without rolling the horizon.
        const underCanopy = elapsed >= FREEFALL_TIME;
        const desiredCamera = new THREE.Vector3(
            skydiver.position.x + (underCanopy ? 7.5 : 6.5),
            skydiver.position.y + (underCanopy ? 24.0 : 5.5),
            skydiver.position.z + (underCanopy ? 15.0 : 9.0)
        );
        const cameraFollow = 1 - Math.exp(-(underCanopy ? 5.0 : 8.0) * dt);
        camera.position.lerp(desiredCamera, cameraFollow);
        camera.lookAt(
            skydiver.position.x,
            skydiver.position.y + (underCanopy ? 1.0 : -2.3),
            skydiver.position.z - (underCanopy ? 4.0 : 3.5)
        );

        // HUD Radar Calculation
        const dist = Math.hypot(skydiver.position.x - targetDZ.x, skydiver.position.z - targetDZ.z);
        $('#radar-distance').text('착지 오차: ' + Math.round(dist * 5) + 'm');

        const relX = Math.max(-45, Math.min(45, (skydiver.position.x - targetDZ.x) * 2.2));
        const relZ = Math.max(-45, Math.min(45, (skydiver.position.z - targetDZ.z) * 2.2));
        $('#radar-player-dot').css({
            'left': `calc(50% + ${relX}px)`,
            'top': `calc(50% + ${relZ}px)`
        });

        // Landing check at 8.0s (3.0 seconds after 5s freefall parachute deploy)
        if (elapsed >= TOTAL_TIME) {
            if (dist <= targetDZ.radius) {
                phase = 'LANDED';
                console.log("🎯 SUCCESSFUL LANDING IN TARGET DZ!");
                $('#minigame-hud').fadeOut(300);

                $('#cutscene-overlay').css({ 'opacity': '0', 'transform': 'scale(1.1)' });
                setTimeout(() => { $('#cutscene-overlay').hide(); }, 600);
            } else {
                phase = 'FAILED';
                console.log("💥 MISSED TARGET DZ! LANDING FAILED (POPPING EXPLOSION).");
                triggerPoppingExplosion();
                $('#minigame-hud').fadeOut(300);
                setTimeout(() => {
                    $('#minigame-fail-box').fadeIn(400);
                }, 550);
            }
        }
    }

    updatePoppingExplosion(dt);

    renderer.render(scene, camera);
}

/* ========================================================
   10b. Popping Explosion Particle System ("뿅!" Effect)
   ======================================================== */
let popExplosionGroup = null;
let popParticles = [];
let popTime = 0;

function triggerPoppingExplosion() {
    if (popExplosionGroup) scene.remove(popExplosionGroup);
    popExplosionGroup = new THREE.Group();
    popParticles = [];
    popTime = 0;

    const colors = [0xff4400, 0xffbb00, 0xffffff, 0xef4444, 0x38bdf8];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const size = 0.5 + Math.random() * 0.9;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.2,
            emissive: color,
            emissiveIntensity: 0.8
        });
        const pMesh = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 10), mat);

        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.2) * Math.PI;
        const speed = 18.0 + Math.random() * 40.0;

        pMesh.position.set(skydiver.position.x, skydiver.position.y, skydiver.position.z);
        popExplosionGroup.add(pMesh);

        popParticles.push({
            mesh: pMesh,
            vx: Math.cos(angle) * Math.cos(elevation) * speed,
            vy: Math.sin(elevation) * speed + 12.0,
            vz: Math.sin(angle) * Math.cos(elevation) * speed,
            scale: 1.0
        });
    }

    // Expanding Shockwave Ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff6600, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.8, 2.5, 32), ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(skydiver.position.x, GROUND_Y + 0.5, skydiver.position.z);
    popExplosionGroup.add(ringMesh);
    popExplosionGroup.ring = ringMesh;

    // Flash Point Light
    const flashLight = new THREE.PointLight(0xff6600, 25.0, 90);
    flashLight.position.set(skydiver.position.x, skydiver.position.y + 2, skydiver.position.z);
    popExplosionGroup.add(flashLight);
    popExplosionGroup.light = flashLight;

    scene.add(popExplosionGroup);

    // Popping scale down skydiver mesh
    skydiver.scale.set(0.01, 0.01, 0.01);
}

function updatePoppingExplosion(dt) {
    if (!popExplosionGroup) return;
    popTime += dt;

    popParticles.forEach(p => {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 30.0 * dt; // Gravity
        p.scale = Math.max(0.01, p.scale - dt * 1.6);
        p.mesh.scale.set(p.scale, p.scale, p.scale);
    });

    if (popExplosionGroup.ring) {
        const ringScale = 1.0 + popTime * 20.0;
        popExplosionGroup.ring.scale.set(ringScale, ringScale, 1.0);
        popExplosionGroup.ring.material.opacity = Math.max(0, 0.95 - popTime * 1.8);
    }

    if (popExplosionGroup.light) {
        popExplosionGroup.light.intensity = Math.max(0, 25.0 - popTime * 40.0);
    }
}

/* ========================================================
   10c. Smooth Scroll Reveal Observer
   ======================================================== */
function initScrollObserver() {
    const targets = document.querySelectorAll('.bento-card, .content-section, .hero-section, .apple-banner, .journey-layout, .pacman-game-wrapper, .guestbook-wrapper');
    targets.forEach(el => el.classList.add('scroll-reveal'));

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-in');
                }
            });
        }, { threshold: 0.12 });

        targets.forEach(el => observer.observe(el));
    } else {
        targets.forEach(el => el.classList.add('scroll-in'));
    }
}

function updateKeyCapsUI() {
    ['w', 'a', 's', 'd'].forEach(k => {
        if (keysPressed[k]) {
            $(`#key-${k}`).addClass('active');
        } else {
            $(`#key-${k}`).removeClass('active');
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ========================================================
   11. Replay Cutscene & Reset Mini-Game
   ======================================================== */
function replayCutscene() {
    if (!scene || !camera || !skydiver) {
        document.querySelector('#intro')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    randomizeFlatDZPosition();

    phase = 'IDLE';
    altitude = 10000;
    animTime = 0;
    currentFov = 55;
    playerPos = { x: targetDZ.x + 18.0, z: targetDZ.z + 25.0 };
    visualSteerX = 0;
    visualSteerZ = 0;
    playerVelocity = { x: 0, z: 0 };

    $('#hud-altitude').text('10,000 m');
    $('#hud-timer').text('8.0 s');

    skydiver.position.set(0, SKYDIVER_START_Y, SKYDIVER_START_Z);
    skydiver.rotation.set(0, 0, 0);
    skydiver.scale.set(1, 1, 1);
    if (popExplosionGroup) {
        scene.remove(popExplosionGroup);
        popExplosionGroup = null;
    }
    parachuteCanopy.visible = false;
    parachuteCanopy.scale.set(1, 1, 1);
    parachuteCanopy.rotation.set(0, 0, 0);
    if (parachuteLinesGroup) parachuteLinesGroup.visible = false;
    if (parachuteLinesGroup) parachuteLinesGroup.scale.set(1, 1, 1);

    seaOfCloudsGroup.position.set(0, 0, 0);
    seaOfCloudsGroup.visible = true;
    seaOfCloudsGroup.children.forEach(c => { c.material.opacity = 0.92; });
    speedLinesGroup.visible = false;

    camera.fov = 55;
    camera.updateProjectionMatrix();

    $('#minigame-hud').hide();
    $('#minigame-fail-box').hide();
    $('#cutscene-ui-box').show();
    $('#btn-drop').prop('disabled', false);

    $('#cutscene-overlay').css({ 'opacity': '1', 'transform': 'scale(1)' }).show();
}

function skipCutscene() {
    phase = 'LANDED';
    $('#cutscene-overlay').stop(true, true).fadeOut(300);
    document.querySelector('#intro')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
}

/* ========================================================
   12. AI Signal Reveal
   ======================================================== */
function initSectionRevealAnimations() {
    const revealTargets = document.querySelectorAll('[data-rule-reveal]');
    if (!revealTargets.length) return;

    document.documentElement.classList.add('ai-reveal-ready');

    if (!('IntersectionObserver' in window)) {
        revealTargets.forEach(target => target.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries, revealObserver) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: 0.24, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach(target => observer.observe(target));
}

/* ========================================================
   13. Guestbook REST API
   ======================================================== */
function loadGuestbook() {
    if (IS_STATIC_DEPLOYMENT) {
        if (hasSupabaseGuestbookConfig()) {
            loadSupabaseGuestbook();
            return;
        }
        renderGuestbookError(STATIC_GUESTBOOK_MESSAGE);
        $('#guestbook-form input, #guestbook-form button').prop('disabled', true);
        return;
    }

    $.ajax({
        url: '/api/guestbook',
        type: 'GET',
        dataType: 'json',
        success: function (res) {
            if (res.success) renderGuestbookList(res.data);
            else renderGuestbookError(res.error);
        },
        error: function () {
            renderGuestbookError('방명록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
    });
}

function hasSupabaseGuestbookConfig() {
    return GUESTBOOK_CONFIG.provider === 'supabase'
        && /^https?:\/\/[^\s]+$/i.test(String(GUESTBOOK_CONFIG.url || '').trim())
        && String(GUESTBOOK_CONFIG.anonKey || '').trim().length > 0;
}

function supabaseGuestbookEndpoint(query) {
    const baseUrl = String(GUESTBOOK_CONFIG.url || '').replace(/\/+$/, '');
    return `${baseUrl}/rest/v1/guestbook${query ? `?${query}` : ''}`;
}

function supabaseGuestbookHeaders(includeJson = false) {
    const anonKey = String(GUESTBOOK_CONFIG.anonKey || '').trim();
    const headers = {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
    };
    if (includeJson) headers['Content-Type'] = 'application/json';
    return headers;
}

async function parseSupabaseResponse(response) {
    const raw = await response.text();
    let data = null;
    try {
        data = raw ? JSON.parse(raw) : null;
    } catch (_) {
        data = null;
    }

    if (!response.ok) {
        throw new Error(
            (data && (data.message || data.error_description || data.error))
            || '방명록 서버에 연결할 수 없습니다.'
        );
    }
    return data;
}

function loadSupabaseGuestbook() {
    fetch(supabaseGuestbookEndpoint('select=id,name,message,created_at&order=created_at.desc&limit=50'), {
        method: 'GET',
        headers: supabaseGuestbookHeaders()
    })
        .then(parseSupabaseResponse)
        .then(items => renderGuestbookList(items))
        .catch(error => renderGuestbookError(error.message));
}

function renderGuestbookError(message) {
    $('#guestbook-list').html(`<div class="guestbook-error">${escapeHtml(message)}</div>`);
}

function renderGuestbookList(items) {
    const $c = $('#guestbook-list');
    $c.empty();

    if (!items || items.length === 0) {
        $c.html('<div class="guestbook-empty">작성된 방명록이 없습니다. 첫 번째 메시지를 남겨보세요.</div>');
        return;
    }

    items.forEach(function (item) {
        $c.append(`
            <div class="guestbook-item" id="item-${item.id}">
                <div>
                    <div class="author-name">${escapeHtml(item.name)}</div>
                    <div class="author-msg">${escapeHtml(item.message)}</div>
                </div>
                <div class="item-right">
                    <span class="item-date">${item.created_at}</span>
                </div>
            </div>
        `);
    });
}

function submitGuestbook() {
    if (IS_STATIC_DEPLOYMENT) {
        if (!hasSupabaseGuestbookConfig()) {
            renderGuestbookError(SUPABASE_GUESTBOOK_SETUP_MESSAGE);
            return;
        }
    }

    const name = $('#input-name').val().trim();
    const message = $('#input-message').val().trim();
    if (!name || !message) { alert("이름과 메시지를 모두 입력해 주세요."); return; }

    const request = IS_STATIC_DEPLOYMENT
        ? fetch(supabaseGuestbookEndpoint(''), {
            method: 'POST',
            headers: {
                ...supabaseGuestbookHeaders(true),
                Prefer: 'return=minimal'
            },
            body: JSON.stringify({ name, message })
        })
        : fetch('/api/guestbook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, message })
        });

    request
    .then(async response => {
        if (IS_STATIC_DEPLOYMENT) {
            await parseSupabaseResponse(response);
            return { success: true };
        }
        return response.json();
    })
    .then(data => {
        if (!data.success) {
            throw new Error(data.error || '방명록 등록에 실패했습니다.');
        }
        $('#input-name').val('');
        $('#input-message').val('');
        loadGuestbook();
    })
    .catch(error => {
        alert(`등록 실패: ${error.message}`);
    });
}

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
