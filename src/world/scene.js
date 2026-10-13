import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ISLANDS, FISH_SPOTS } from './content.js';
import {
  box,
  cylinder,
  tree,
  rock,
  barrel,
  crate,
  house,
  tower,
  person,
  ship,
  islandMesh,
  windmill,
  lanternPost,
  fishDryingRack,
  shipwreck,
  salvageFlotsam,
  ancientRuin,
  cuteFish,
  coralCluster,
  seaweedPatch,
  starfish,
  pierLadder,
  rowboat,
  mat
} from './assets.js';

export class WorldScene {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.colliders = [];
    this.npcs = [];
    this.shopkeepers = [];
    this.settledIslands = new Set();
    this.windmills = [];
    this.flags = new Map();
    this.fishMeshes = new Map();
    this.fishEntities = [];
    this.islandGroups = new Map();
    this.particles = [];
    this.performanceClock = 0;
    this.performanceFrames = 0;

    // Three.js Core Scene & Sky
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0xa7d8d0); // Warm tropical sky
    this.scene.fog = new T.FogExp2(0xa7d8d0, 0.0022);

    // High performance WebGL Renderer (No heavy multi-pass blur shaders for buttery 60 FPS!)
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.setAttribute(
      'aria-label',
      'Interactive 3D naval world. WASD to move or steer, E to interact, and click the pier or water to travel.'
    );
    this.renderer.domElement.tabIndex = 0;

    // Cozy, immersive top-down isometric camera (matching reference screenshot)
    this.camera = new T.OrthographicCamera(-38, 38, 26, -26, 0.1, 800);
    this.focus = new T.Vector3(state.x, 1, state.z);
    this.zoom = 28; // Cozy close camera view of the pier, character, and crystal water!
    this.panOffset = new T.Vector3();

    // Warm Tropical Sun Lighting
    this.hemiLight = new T.HemisphereLight(0xfff7e6, 0x38b2ac, 2.4);
    this.scene.add(this.hemiLight);

    this.sun = new T.DirectionalLight(0xffedd5, 3.2);
    this.sun.position.set(-50, 110, 45);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -90,
      right: 90,
      top: 90,
      bottom: -90,
      near: 1,
      far: 260
    });
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.12;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Seabed Sea Floor & Crystal Turquoise Living Ocean (matching reference screenshot!)
    this.createSeabed();
    this.createSea();

    // Build Archipelago
    for (const island of ISLANDS) {
      this.createIsland(island);
    }
    this.batchStatics();

    // Player Avatar (Straw Hat Fisherman / Captain Rowan from reference image)
    this.player = person(0xac543c, 0, 'captain');
    this.scene.add(this.player);

    // Soft golden movement selection ring
    this.selectRing = new T.Mesh(
      new T.RingGeometry(0.95, 1.15, 32),
      new T.MeshBasicMaterial({ color: 0xffe89e, side: T.DoubleSide, transparent: true, opacity: 0.75 })
    );
    this.selectRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.selectRing);

    // Player vessel
    this.updateShip(state);

    // Target waypoint beacon ring
    this.destination = new T.Group();
    const destRing = new T.Mesh(
      new T.RingGeometry(0.7, 0.95, 32),
      new T.MeshBasicMaterial({ color: 0xfff6cf, side: T.DoubleSide, transparent: true, opacity: 0.85 })
    );
    destRing.rotation.x = -Math.PI / 2;
    this.destination.add(destRing);
    this.destination.visible = false;
    this.scene.add(this.destination);

    // Fishing Bobber & Line (matching red/white bobber in reference screenshot)
    this.bobber = new T.Group();
    this.bobber.add(cylinder(0.14, 0.14, 0.32, 0xef4444, 0, 0.16)); // Red top
    this.bobber.add(cylinder(0.14, 0.14, 0.22, 0xffffff, 0, 0.42)); // White bottom
    this.scene.add(this.bobber);
    this.bobber.visible = false;

    this.rodLine = new T.Line(
      new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
      new T.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 })
    );
    this.rodLine.visible = false;
    this.scene.add(this.rodLine);

    // Raycaster for click-to-move
    this.raycaster = new T.Raycaster();
    this.pointer = new T.Vector2();
    this.plane = new T.Plane(new T.Vector3(0, 1, 0), -2);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  // Sandy Seabed with Corals, Seaweed, and Starfish visible through crystal clear water
  createSeabed() {
    // Golden sand seabed
    const seabedGeo = new T.PlaneGeometry(1600, 1600, 60, 60);
    const seabedMat = new T.MeshStandardMaterial({
      color: 0xdfcb9b,
      roughness: 0.92,
      flatShading: true
    });
    const seabed = new T.Mesh(seabedGeo, seabedMat);
    seabed.rotation.x = -Math.PI / 2;
    seabed.position.y = -3.2; // 3.2 units below water surface
    seabed.receiveShadow = true;
    this.scene.add(seabed);

    // Raised coral reef shelf mound on the right from reference screenshot
    const reefBase = cylinder(5.5, 7.2, 1.8, 0xc7c3a0, 22, -2.3, 89, 14);
    this.scene.add(reefBase);

    // Scatter colorful corals, seaweed, and starfish near Haven pier (matching reference screenshot!)
    const seabedFeatures = [
      { x: -5, z: 87, type: 'coral', color: 0x1d4ed8 }, // Blue coral mound left
      { x: -6, z: 93, type: 'coral', color: 0x2563eb },
      { x: 22, z: 89, type: 'coral', color: 0x2563eb, y: -1.4 }, // On the raised reef shelf
      { x: 20, z: 86, type: 'coral', color: 0x1d4ed8, y: -1.5 },
      { x: 24, z: 91, type: 'coral', color: 0x3b82f6, y: -1.5 },
      { x: -4, z: 87, type: 'seaweed' },
      { x: -3, z: 94, type: 'seaweed' },
      { x: 16, z: 80, type: 'seaweed' },
      { x: 25, z: 84, type: 'seaweed' },
      { x: 4, z: 94, type: 'starfish', color: 0xf97316 },
      { x: 12, z: 92, type: 'starfish', color: 0xef4444 },
      { x: 25, z: 87, type: 'starfish', color: 0xeab308 },
      { x: 1, z: 86, type: 'starfish', color: 0x22c55e }
    ];

    for (const f of seabedFeatures) {
      let m;
      if (f.type === 'coral') m = coralCluster(f.color);
      else if (f.type === 'seaweed') m = seaweedPatch();
      else if (f.type === 'starfish') m = starfish(f.color);
      if (m) {
        m.position.set(f.x, f.y ?? -3.15, f.z);
        this.scene.add(m);
      }
    }
  }

  // Crystal Clear Living Turquoise Ocean (matching reference screenshot!)
  createSea() {
    this.seaMaterial = new T.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        sunDir: { value: new T.Vector3(-0.65, 0.78, -0.22).normalize() },
        cameraPos: { value: new T.Vector3() }
      },
      vertexShader: `
        uniform float time;
        varying vec3 world;
        varying vec3 vNormal;
        varying float waveH;
        void main() {
          vec3 p = position;
          // Smooth physical rolling waves
          float w1 = sin(p.x * 0.14 + time * 1.3) * 0.18;
          float w2 = cos(p.y * 0.12 + time * 1.0) * 0.14;
          float w3 = sin((p.x * 0.09 + p.y * 0.11) + time * 1.6) * 0.08;
          p.z += w1 + w2 + w3;
          waveH = w1 + w2 + w3;

          vec4 wp = modelMatrix * vec4(p, 1.0);
          world = wp.xyz;

          float dx = 0.14 * 0.18 * cos(p.x * 0.14 + time * 1.3) + 0.09 * 0.08 * cos((p.x * 0.09 + p.y * 0.11) + time * 1.6);
          float dz = -0.12 * 0.14 * sin(p.y * 0.12 + time * 1.0) + 0.11 * 0.08 * cos((p.x * 0.09 + p.y * 0.11) + time * 1.6);
          vNormal = normalize(vec3(-dx, 1.0, -dz));
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 sunDir;
        uniform vec3 cameraPos;
        varying vec3 world;
        varying vec3 vNormal;
        varying float waveH;
        void main() {
          // Vibrant Caribbean turquoise palette matching reference screenshot
          vec3 shallows = vec3(0.12, 0.78, 0.76); // Clean tropical turquoise
          vec3 deep = vec3(0.08, 0.60, 0.63);     // Deep clear turquoise

          vec3 waterCol = mix(deep, shallows, clamp(waveH * 2.2 + 0.5, 0.0, 1.0));

          // Dominant rolling wave ridges with natural harmonic turbulence (matching reference screenshot)
          float t = time * 2.0;
          vec2 p = world.xz * 0.28;
          float w1 = sin(p.x * 0.85 + p.y * 0.45 + t);
          float w2 = sin(p.x * 1.70 + p.y * 0.90 + t * 1.4 + w1 * 0.6);
          float w3 = sin(p.x * 3.40 + p.y * 1.80 + t * 2.1 + w2 * 0.4);

          // Gentle cross flutter
          float flutter = cos(p.x * 0.35 - p.y * 0.55 + t * 0.8) * 0.04;

          vec2 grad = vec2(0.85, 0.45) * (cos(p.x * 0.85 + p.y * 0.45 + t) * 0.12 +
                                          cos(p.x * 1.70 + p.y * 0.90 + t * 1.4) * 0.08 +
                                          cos(p.x * 3.40 + p.y * 1.80 + t * 2.1) * 0.04)
                    + vec2(0.35, -0.55) * flutter;

          vec3 rippleNorm = normalize(vNormal + vec3(-grad.x, 0.0, -grad.y));

          // Physical specular sunlight reflection localized to reflection glade on left
          vec3 viewDir = normalize(vec3(0.0, 78.0, 42.0));
          vec3 halfVec = normalize(sunDir + viewDir);
          float NdotH = max(0.0, dot(rippleNorm, halfVec));

          // Specular glint only where sunlight reflects into camera (concentrated on left side!)
          float sunGlade = smoothstep(14.0, -28.0, world.x);
          float spec = (pow(NdotH, 64.0) * 1.8 + pow(NdotH, 200.0) * 3.6) * sunGlade;

          waterCol += vec3(1.0, 1.0, 0.96) * spec;

          // Crystal clear translucency so seabed coral & starfish shine through brightly
          gl_FragColor = vec4(waterCol, 0.82);
        }
      `
    });

    const ocean = new T.Mesh(new T.PlaneGeometry(1500, 1500, 100, 100), this.seaMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.receiveShadow = true;
    this.scene.add(ocean);
  }

  createIsland(island) {
    const group = new T.Group();
    group.position.set(island.x, 0, island.z);
    this.scene.add(group);
    this.islandGroups.set(island.id, group);

    // 3D Island Terrain
    group.add(islandMesh(island));

    const occupied = [];
    const addBuilding = (asset, x, z, r = 4.5) => {
      asset.position.set(x, 2, z);
      group.add(asset);
      occupied.push({ x, z, r });
      this.colliders.push({ x: x + island.x, z: z + island.z, r });
      return asset;
    };

    if (island.type !== 'wild') {
      // Main street & crossway
      const road = box(4.2, 0.05, island.rz * 1.55, 0xc4be92, 8, 2.06, 5);
      road.receiveShadow = true;
      group.add(road);
      group.add(box(island.rx * 1.25, 0.04, 3.8, 0xc4be92, 0, 2.08, 12));

      // Village buildings
      const layouts = [
        [-8, 12, 1], [-21, 12, 0], [21, 13, 1], [32, 9, 0],
        [-8, -3, 2], [21, -5, 2], [-24, -6, 0], [-6, -18, 0],
        [21, -20, 0], [-27, 25, 1], [-33, -20, 0]
      ];
      layouts.forEach(([x, z, v]) => {
        if (Math.hypot(x / island.rx, z / island.rz) < 0.82) {
          addBuilding(house(island.roof, v, island.theme), x, z, 4.7);
        }
      });

      if (island.id === 'crescent') {
        const mill = addBuilding(windmill(), -16, -22, 5);
        this.windmills.push(mill);
      }

      if (island.id === 'haven') {
        const drying = fishDryingRack();
        drying.position.set(-18, 2, 22);
        group.add(drying);
      }

      if (island.type === 'hostile') {
        const fort = addBuilding(tower(true), 8, -15, 5);
        this.flags.set(island.id, fort.userData.flag);
        fort.userData.island = island.id;
        group.add(fort);
      }

      // Town square with well & street lantern
      const square = box(9.5, 0.06, 9.5, 0xc7c098, 8, 2.08, 12);
      group.add(square);
      const well = cylinder(1.15, 1.25, 1.5, 0xc2ba99, 8, 2.7, 5);
      group.add(well);
      group.add(cylinder(0.75, 0.75, 0.1, 0x5a8a86, 8, 3.42, 5));
      const lantern = lanternPost(true);
      lantern.position.set(11.5, 2.08, 15);
      group.add(lantern);

      // Townfolk NPCs
      for (let n = 0; n < 5; n++) {
        const npc = person([0x738672, 0xc89b66, 0x727d8b, 0x97664d][n % 4], n, 'townfolk');
        npc.userData.home = { x: island.x + 8 + (n % 2 ? 9 : -8), z: island.z + 9 + n * 3 };
        npc.position.set(npc.userData.home.x, 2, npc.userData.home.z);
        this.npcs.push(npc);
        this.scene.add(npc);
      }

      // Shopkeepers
      for (const [x, z, color, role] of [
        [-12, 24, 0x9d6e56, 'merchant'],
        [24, 25, 0x6b7d6c, 'shipwright']
      ]) {
        const shopkeeper = person(color, 2, role);
        shopkeeper.position.set(island.x + x, 2.13, island.z + z);
        this.shopkeepers.push(shopkeeper);
        this.scene.add(shopkeeper);
      }
    } else {
      if (island.id === 'wild') {
        const ruins = ancientRuin();
        ruins.position.set(0, 2, 0);
        group.add(ruins);
        this.colliders.push({ x: island.x, z: island.z, r: 4 });
      }
      const sign = box(2.4, 1.1, 0.22, 0xa98755, 8, 3.5, 12);
      group.add(sign);
      group.add(cylinder(0.1, 0.1, 1.5, 0x8b7556, 8, 2.7, 12));
    }

    // Extended Scenic Wooden Pier extending out into crystal turquoise water (matching reference screenshot)
    // Walkway planks with individual warm wood tones and grain variations
    for (let z = island.rz - 6; z <= island.rz + 44; z += 0.72) {
      const plankColor = z % 2.1 < 0.7 ? 0x946440 : (z % 2.1 < 1.4 ? 0x835532 : 0xa16f46);
      group.add(box(6.4, 0.26, 0.66, plankColor, 8, 2.05, z));
    }

    // Wooden pilings supporting the pier walkway with rounded light-wood caps
    for (let z = island.rz - 4; z <= island.rz + 43; z += 4.5) {
      for (const x of [4.8, 11.2]) {
        // Heavy pillar down into the turquoise seabed
        group.add(cylinder(0.2, 0.22, 5.2, 0x6e4d2e, x, -0.2, z));
        // Rounded cap on top
        group.add(cylinder(0.25, 0.25, 0.18, 0xdfcb9b, x, 2.54, z));
      }
    }

    // Wide Pier Platform at the end surrounded by ocean (matching reference screenshot)
    const pierPlatform = box(11.2, 0.28, 6.2, 0x946440, 8, 2.07, island.rz + 47.0);
    group.add(pierPlatform);

    // Platform corner pilings with light wood caps
    for (const [px, pz] of [
      [2.6, island.rz + 44.2],
      [13.4, island.rz + 44.2],
      [2.6, island.rz + 49.8],
      [13.4, island.rz + 49.8]
    ]) {
      group.add(cylinder(0.22, 0.24, 5.2, 0x6e4d2e, px, -0.2, pz));
      group.add(cylinder(0.26, 0.26, 0.18, 0xdfcb9b, px, 2.54, pz));
    }

    // Wooden Ladder hanging down into the crystal water (exactly like reference image!)
    const ladder = pierLadder();
    ladder.position.set(8, 2.05, island.rz + 50.2);
    group.add(ladder);

    // Pier Props: Wooden drying rack, supply crate, and lantern post (from reference screenshot)
    const tackleCrate = crate();
    tackleCrate.position.set(5.2, 2.1, island.rz + 47.0);
    tackleCrate.scale.set(0.9, 0.45, 0.9);
    group.add(tackleCrate);

    const supplyBox = box(1.4, 1.2, 1.4, 0xb89569, 10.6, 2.7, island.rz + 47.2);
    group.add(supplyBox);

    const pierLantern = lanternPost(true);
    pierLantern.position.set(12.2, 2.07, island.rz + 48.6);
    group.add(pierLantern);

    // Small kitten / bucket resting near the ladder edge from reference screenshot
    const kitten = box(0.35, 0.35, 0.4, 0x3d352e, 9.1, 2.25, island.rz + 49.6);
    group.add(kitten);

    // Wooden Rowboat moored alongside the pier (matching reference image!)
    if (island.id !== 'haven') {
      const mooredBoat = rowboat();
      mooredBoat.position.set(13.6, 0.1, island.rz + 22.0);
      mooredBoat.rotation.y = 0.05;
      group.add(mooredBoat);
    }

    // Mooring line to piling
    const mooringRope = box(0.04, 0.04, 1.4, 0xd4c79e, 12.4, 0.6, island.rz + 22.0);
    mooringRope.rotation.y = 0.7;
    group.add(mooringRope);

    // Harbor flag
    const smallFlag = box(1.6, 1.0, 0.06, island.type === 'hostile' ? 0xa1533c : 0x547b61, 9.2, 7, island.rz + 42);
    group.add(cylinder(0.09, 0.09, 5.2, 0x84734f, 8.5, 4.5, island.rz + 42));
    group.add(smallFlag);
    if (island.type !== 'hostile') this.flags.set(island.id, smallFlag);
    else group.userData.harborFlag = smallFlag;

    // Foliage (Palm trees and oaks)
    const rand = n => {
      const x = Math.sin(n * 127.1 + island.seed * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    for (let n = 0; n < 60; n++) {
      const angle = rand(n + 1) * Math.PI * 2;
      const r = 0.42 + rand(n + 88) * 0.48;
      const x = Math.cos(angle) * island.rx * r;
      const z = Math.sin(angle) * island.rz * r;
      if (Math.abs(x - 8) < 7 && z > 0 || Math.abs(z - 12) < 6 || occupied.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 2.5)) {
        continue;
      }
      const asset = tree(n, island.theme === 'foundry' ? false : (n % 4 !== 0));
      asset.position.set(x, 2, z);
      asset.scale.setScalar(0.8 + rand(n + 99) * 0.45);
      asset.rotation.y = rand(n + 44) * 6.28;
      group.add(asset);
    }

    // Coastal rocks
    for (let n = 0; n < 14; n++) {
      const a = rand(n + 201) * 6.28;
      const r = 0.96 + rand(n + 212) * 0.13;
      const stone = rock(n, 0.7 + rand(n + 234) * 1.5);
      stone.position.set(Math.cos(a) * island.rx * r, 0.6, Math.sin(a) * island.rz * r);
      group.add(stone);
    }

    // Fish Schools swimming in clear water (matching reference screenshot!)
    for (const spot of FISH_SPOTS.filter(s => s.island === island.id)) {
      const school = new T.Group();
      school.position.set(spot.x, 0, spot.z);

      // Create cute detailed fish swimming in school orbits
      const fishList = [];
      for (let n = 0; n < 6; n++) {
        const fishColor = n % 2 ? 0x2d3748 : 0x1f2937;
        const fish = cuteFish(fishColor);
        fish.position.set(Math.sin(n * 1.05) * 2.4, -0.6, Math.cos(n * 1.05) * 2.4);
        school.add(fish);
        fishList.push({
          mesh: fish,
          orbitR: 2.2 + (n % 3) * 0.5,
          speed: 0.8 + (n % 2) * 0.4,
          offset: (n / 6) * Math.PI * 2
        });
      }

      // Soft water ripple ring above the school
      const ripple = new T.Mesh(
        new T.RingGeometry(3.0, 3.14, 36),
        new T.MeshBasicMaterial({ color: 0x99f6e4, transparent: true, opacity: 0.45, side: T.DoubleSide })
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.y = 0.08;
      school.add(ripple);

      this.fishMeshes.set(spot.id, school);
      this.fishEntities.push({ id: spot.id, school, fishList });
      this.scene.add(school);
    }
  }

  batchStatics() {
    this.scene.updateMatrixWorld(true);
    const keep = new Set(this.flags.values());
    for (const group of this.islandGroups.values()) {
      if (group.userData.harborFlag) keep.add(group.userData.harborFlag);
    }

    for (const group of this.islandGroups.values()) {
      const batches = new Map();
      group.traverse(object => {
        if (!object.isMesh || keep.has(object) || object.geometry.attributes.color) return;
        let parent = object.parent;
        while (parent && parent !== group) {
          if (parent.userData.blades) return;
          parent = parent.parent;
        }
        const key = `${object.material.uuid}:${object.castShadow}`;
        if (!batches.has(key)) {
          batches.set(key, { material: object.material, shadow: object.castShadow, objects: [] });
        }
        batches.get(key).objects.push(object);
      });

      for (const batch of batches.values()) {
        const geometries = batch.objects.map(object => {
          const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
          geometry.applyMatrix4(object.matrixWorld);
          return geometry;
        });
        const geometry = mergeGeometries(geometries);
        if (!geometry) continue;
        geometry.computeBoundingSphere();
        const mesh = new T.Mesh(geometry, batch.material);
        mesh.castShadow = batch.shadow;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        for (const object of batch.objects) object.removeFromParent();
        for (const geo of geometries) geo.dispose();
      }
    }
  }

  settleIsland(island) {
    if (this.settledIslands.has(island.id)) return;
    this.settledIslands.add(island.id);
    for (const [x, z, color] of [
      [-12, 14, 0x9d6e56],
      [14, 14, 0x6b7d6c]
    ]) {
      const npc = person(color, 3, 'townfolk');
      npc.position.set(island.x + x, 2.13, island.z + z);
      this.shopkeepers.push(npc);
      this.scene.add(npc);
    }
  }

  updateShip(state) {
    if (this.boat) this.scene.remove(this.boat);
    this.boat = ship({ tier: state.tier, cannon: state.cannon });
    this.scene.add(this.boat);
    if (this.captain) this.boat.remove(this.captain);
    this.captain = person(0xac543c, 0, 'captain');
    this.captain.scale.setScalar(0.78);
    this.captain.position.set(0, 1.05, -1.3);
    this.boat.add(this.captain);
  }

  addSplash(x, z) {
    const splashGroup = new T.Group();
    splashGroup.position.set(x, 0.15, z);
    const ring = new T.Mesh(
      new T.RingGeometry(0.2, 0.6, 16),
      new T.MeshBasicMaterial({ color: 0xccfbf1, side: T.DoubleSide, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    splashGroup.add(ring);
    this.scene.add(splashGroup);
    this.particles.push({ obj: splashGroup, life: 0, maxLife: 0.55, type: 'splash', ring });
  }

  addSmoke(x, y, z, color = 0xddddcc) {
    const smoke = box(0.6, 0.6, 0.6, color, x, y, z, { transparent: true, opacity: 0.7 });
    this.scene.add(smoke);
    this.particles.push({ obj: smoke, life: 0, maxLife: 0.8, type: 'smoke' });
  }

  addSplinters(x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    for (let i = 0; i < 4; i++) {
      const sp = box(0.12, 0.45, 0.12, 0x8a6e4d, (Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6);
      g.add(sp);
    }
    this.scene.add(g);
    this.particles.push({ obj: g, life: 0, maxLife: 0.5, type: 'splinters' });
  }

  updateParticles(dt) {
    const expired = [];
    for (const p of this.particles) {
      p.life += dt;
      const progress = p.life / p.maxLife;
      if (p.type === 'splash') {
        p.obj.scale.setScalar(1 + progress * 2.5);
        p.ring.material.opacity = Math.max(0, 0.9 * (1 - progress));
      } else if (p.type === 'smoke') {
        p.obj.position.y += dt * 1.5;
        p.obj.scale.setScalar(1 + progress * 1.8);
        p.obj.material.opacity = Math.max(0, 0.7 * (1 - progress));
      } else if (p.type === 'splinters') {
        p.obj.position.y -= dt * 1.2;
        p.obj.rotation.x += dt * 5;
        p.obj.rotation.z += dt * 5;
      }
      if (p.life >= p.maxLife) {
        expired.push(p);
      }
    }
    for (const p of expired) {
      this.scene.remove(p.obj);
      this.particles.splice(this.particles.indexOf(p), 1);
    }
  }

  isBlocked(x, z) {
    return this.colliders.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 0.6);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.aspect = w / h;
    this.setZoom(this.zoom);
  }

  setZoom(value) {
    this.zoom = T.MathUtils.clamp(value, 18, 90);
    this.camera.left = -this.zoom * this.aspect;
    this.camera.right = this.zoom * this.aspect;
    this.camera.top = this.zoom;
    this.camera.bottom = -this.zoom;
    this.camera.updateProjectionMatrix();
  }

  worldPoint(clientX, clientY, sea = false) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.plane.constant = sea ? 0 : -2;
    const point = new T.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, point);
    return { x: point.x, z: point.z };
  }

  screenPoint(x, y, z) {
    const point = new T.Vector3(x, y, z).project(this.camera);
    return {
      x: (point.x * 0.5 + 0.5) * this.container.clientWidth,
      y: (-point.y * 0.5 + 0.5) * this.container.clientHeight,
      visible: point.z < 1 && Math.abs(point.x) < 1.1 && Math.abs(point.y) < 1.1
    };
  }

  render(s, time, dt, walking, fishing) {
    this.seaMaterial.uniforms.time.value = time;
    this.updateParticles(dt);

    // Smooth following camera with comfortable perspective
    const focus = new T.Vector3(s.x, 1, s.z).add(this.panOffset);
    this.focus.lerp(focus, 1 - Math.exp(-dt * 6));
    // High-angle top-down view looking vertically down the wooden pier (matching reference screenshot)
    this.camera.position.copy(this.focus).add(new T.Vector3(0, 78, 42));
    this.camera.lookAt(this.focus);
    this.seaMaterial.uniforms.cameraPos.value.copy(this.camera.position);

    // Warm tropical sun shining from top-left casting soft shadows and water glints
    this.sun.position.copy(this.focus).add(new T.Vector3(-60, 110, -50));
    this.sun.target.position.copy(this.focus);

    // Player Avatar update
    this.player.visible = s.mode === 'foot';
    this.player.position.set(s.x, 2.13, s.z);
    this.player.rotation.y = s.heading;

    this.selectRing.visible = false;

    // Walk animation
    const phase = time * (walking ? 11 : 2);
    this.player.userData.limbs.forEach((limb, n) => {
      limb.rotation.x = walking ? Math.sin(phase + (n % 2 ? Math.PI : 0)) * 0.55 : Math.sin(phase) * 0.03;
    });
    this.player.userData.body.position.y = walking ? Math.abs(Math.sin(phase)) * 0.065 : Math.sin(time * 2) * 0.015;

    // Fishing rod posture
    if (fishing) {
      this.player.userData.fishingRod.rotation.x = -0.95;
      this.player.userData.limbs[1].rotation.x = -1.1;
      this.player.userData.limbs[3].rotation.x = -1.1;
    } else {
      this.player.userData.fishingRod.rotation.x = -0.55;
    }

    // Ship motion
    this.boat.position.set(s.boat.x, Math.sin(time * 1.5) * 0.08, s.boat.z);
    this.boat.rotation.set(
      Math.sin(time * 1.8) * 0.015,
      s.boat.heading,
      Math.sin(time * 1.1) * 0.022
    );
    this.captain.visible = s.mode === 'ship';
    this.boat.userData.sails.forEach((sail, n) => {
      sail.rotation.y = Math.sin(time * 0.6 + n) * 0.09;
    });

    // Townfolk NPC wandering
    for (const npc of this.npcs) {
      const home = npc.userData.home;
      const seed = npc.userData.seed;
      const a = time * 0.12 + seed;
      const x = home.x + Math.sin(a) * 2.2;
      const z = home.z + Math.cos(a) * 2.2;
      npc.position.set(x, 2.13, z);
      npc.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a));
      npc.userData.limbs.forEach((limb, n) => {
        limb.rotation.x = Math.sin(time * 7 + seed + (n % 2 ? Math.PI : 0)) * 0.35;
      });
    }

    // Shopkeepers facing player
    for (const npc of this.shopkeepers) {
      npc.userData.body.position.y = Math.sin(time * 1.4) * 0.025;
      if (Math.hypot(npc.position.x - s.x, npc.position.z - s.z) < 14) {
        npc.rotation.y = Math.atan2(s.x - npc.position.x, s.z - npc.position.z);
      }
    }

    for (const mill of this.windmills) {
      mill.userData.blades.rotation.z = time * 0.65;
    }

    // Realistic lively swimming fish animation in schools (matching reference screenshot!)
    for (const entity of this.fishEntities) {
      const isAlive = s.stocks[entity.id] > 0;
      entity.school.visible = isAlive;
      if (!isAlive) continue;

      for (const item of entity.fishList) {
        const angle = time * item.speed + item.offset;
        const x = Math.sin(angle) * item.orbitR;
        const z = Math.cos(angle) * item.orbitR;
        item.mesh.position.set(x, -0.65 + Math.sin(time * 2 + item.offset) * 0.08, z);
        // Point tangent to the orbit
        item.mesh.rotation.y = angle + Math.PI / 2;
        // Tail waggle animation!
        if (item.mesh.userData.tail) {
          item.mesh.userData.tail.rotation.y = Math.sin(time * 8 + item.offset) * 0.32;
        }
      }
    }

    // Waving island flags
    for (const [id, flag] of this.flags) {
      if (s.captured.includes(id)) flag.material = mat(0x427552);
      flag.rotation.y = Math.sin(time * 2.2) * 0.07;
    }

    // Fishing line & bobber
    if (fishing) {
      const spot = fishing.spot;
      this.bobber.visible = true;
      this.rodLine.visible = true;
      this.bobber.position.set(spot.x, 0.15 + Math.sin(time * 3.2) * 0.06, spot.z);
      this.rodLine.geometry.setFromPoints([
        new T.Vector3(s.x - 0.7, 2.9, s.z - 0.3),
        new T.Vector3(spot.x, 0.22, spot.z)
      ]);
    } else {
      this.bobber.visible = false;
      this.rodLine.visible = false;
    }

    // Direct render for smooth 60 FPS (Zero post-processing stutter)
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.scene.traverse(object => {
      object.geometry?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
