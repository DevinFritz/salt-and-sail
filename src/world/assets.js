import * as T from 'three';

const materialCache = new Map();

export function mat(color, options = {}) {
  const key = `${color}:${JSON.stringify(options)}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new T.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.72,
      metalness: options.metalness ?? 0.05,
      flatShading: true,
      ...options
    }));
  }
  return materialCache.get(key);
}

export function box(w, h, d, color, x = 0, y = 0, z = 0, options = {}) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(color, options));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cylinder(top, bottom, height, color, x = 0, y = 0, z = 0, sides = 8, options = {}) {
  const m = new T.Mesh(new T.CylinderGeometry(top, bottom, height, sides), mat(color, options));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r, color, x = 0, y = 0, z = 0, detail = 1, options = {}) {
  const m = new T.Mesh(new T.IcosahedronGeometry(r, detail), mat(color, options));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Stylized Realistic Swimming Fish (matching reference screenshot)
export function cuteFish(color = 0x3d4745) {
  const g = new T.Group();
  // Fish body: sleek tapered shape
  const body = new T.Mesh(new T.ConeGeometry(0.24, 1.25, 6), mat(color));
  body.rotation.z = Math.PI / 2;
  g.add(body);

  // Light belly stripe
  const belly = new T.Mesh(new T.ConeGeometry(0.18, 1.1, 5), mat(0xdde8e3));
  belly.rotation.z = Math.PI / 2;
  belly.position.y = -0.06;
  g.add(belly);

  // Tail fin (caudal)
  const tailShape = new T.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(-0.35, 0.28);
  tailShape.lineTo(-0.25, 0);
  tailShape.lineTo(-0.35, -0.28);
  tailShape.closePath();
  const tail = new T.Mesh(new T.ShapeGeometry(tailShape), mat(color, { side: T.DoubleSide }));
  tail.position.set(-0.65, 0, 0);
  g.add(tail);

  // Dorsal fin
  const finShape = new T.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(-0.22, 0.22);
  finShape.lineTo(-0.38, 0);
  finShape.closePath();
  const dorsal = new T.Mesh(new T.ShapeGeometry(finShape), mat(color, { side: T.DoubleSide }));
  dorsal.position.set(0.15, 0.16, 0);
  g.add(dorsal);

  // Little eyes
  g.add(sphere(0.045, 0x111817, 0.45, 0.08, 0.14));
  g.add(sphere(0.045, 0x111817, 0.45, 0.08, -0.14));

  g.userData = { tail };
  return g;
}

// Coral Mound (Vibrant Blue & Cyan Coral from reference screenshot)
export function coralCluster(color = 0x2b5ec4) {
  const g = new T.Group();
  const base = new T.Mesh(new T.DodecahedronGeometry(1.2, 1), mat(0x1e3a8a));
  base.scale.set(1.4, 0.8, 1.3);
  g.add(base);

  // Tubular coral branches
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const r = 0.5 + Math.sin(i * 3) * 0.3;
    const h = 0.8 + Math.sin(i * 5) * 0.4;
    const tube = cylinder(0.18, 0.24, h, color, Math.cos(a) * r, h / 2 + 0.3, Math.sin(a) * r, 6);
    tube.rotation.x = Math.sin(a) * 0.25;
    tube.rotation.z = Math.cos(a) * 0.25;
    g.add(tube);
  }

  // Sponges around base
  for (let s = 0; s < 3; s++) {
    const sa = (s / 3) * Math.PI * 2 + 0.5;
    const sponge = sphere(0.42, 0x4ade80, Math.cos(sa) * 1.2, 0.25, Math.sin(sa) * 1.2);
    sponge.scale.set(1, 0.6, 1);
    g.add(sponge);
  }
  return g;
}

// Underwater Seagrass & Kelp
export function seaweedPatch() {
  const g = new T.Group();
  const greens = [0x16a34a, 0x15803d, 0x22c55e];
  for (let n = 0; n < 8; n++) {
    const a = (n / 8) * Math.PI * 2;
    const r = 0.4 + (n % 3) * 0.3;
    const h = 1.4 + (n % 4) * 0.5;
    const blade = cylinder(0.02, 0.08, h, greens[n % greens.length], Math.cos(a) * r, h / 2, Math.sin(a) * r, 4);
    blade.rotation.x = Math.sin(n * 2) * 0.25;
    blade.rotation.z = Math.cos(n * 2) * 0.25;
    g.add(blade);
  }
  return g;
}

// Starfish on Seabed
export function starfish(color = 0xf97316) {
  const g = new T.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = box(0.14, 0.05, 0.65, color, Math.sin(a) * 0.28, 0.02, Math.cos(a) * 0.28);
    arm.rotation.y = -a;
    g.add(arm);
  }
  g.add(sphere(0.18, color, 0, 0.04, 0));
  return g;
}

// Pier Ladder (hanging into clear water, from reference screenshot)
export function pierLadder() {
  const g = new T.Group();
  const h = 3.6;
  for (const x of [-0.45, 0.45]) {
    g.add(cylinder(0.06, 0.06, h, 0x6e4e30, x, -h / 2 + 1.2, 0));
  }
  for (let y = -h + 1.6; y <= 1.0; y += 0.55) {
    g.add(box(0.9, 0.08, 0.08, 0x8b6540, 0, y, 0));
  }
  return g;
}

// Rowboat tied alongside the pier (from reference screenshot)
export function rowboat() {
  const g = new T.Group();
  // Bottom hull
  const bottom = box(1.6, 0.2, 4.4, 0x855835, 0, 0.1, 0);
  g.add(bottom);
  // Flared wooden sides
  const leftSide = box(0.16, 0.7, 4.4, 0x966840, -0.88, 0.45, 0);
  leftSide.rotation.z = -0.18;
  g.add(leftSide);
  const rightSide = box(0.16, 0.7, 4.4, 0x966840, 0.88, 0.45, 0);
  rightSide.rotation.z = 0.18;
  g.add(rightSide);
  // Pointed Bow at the front
  const bow = cylinder(0.06, 0.85, 1.3, 0x855835, 0, 0.45, -2.3, 3);
  bow.rotation.x = -Math.PI / 2;
  g.add(bow);
  // Flat transom at the stern
  g.add(box(1.85, 0.7, 0.18, 0x764c28, 0, 0.45, 2.15));
  // Wood benches (thwarts)
  for (const z of [-0.8, 0.5]) {
    g.add(box(1.65, 0.1, 0.44, 0x6b4122, 0, 0.58, z));
  }
  // Oars resting in boat
  for (const [x, side] of [[-0.92, -1], [0.92, 1]]) {
    const oar = cylinder(0.04, 0.04, 2.5, 0xba9468, x, 0.75, -0.1);
    oar.rotation.z = side * 0.35;
    oar.rotation.x = 0.15;
    g.add(oar);
  }
  g.userData = { sails: [], length: 4.4, width: 1.8 };
  return g;
}

// Palm Tree
export function palmTree(seed = 0) {
  const g = new T.Group();
  const height = 6.8 + Math.sin(seed * 11) * 0.8;
  const segments = 6;
  const lean = Math.sin(seed * 2.3) * 0.18;

  let prevPos = new T.Vector3(0, 0, 0);
  for (let i = 0; i < segments; i++) {
    const t = (i + 1) / segments;
    const y = t * height;
    const x = Math.sin(t * Math.PI * 0.5) * lean * height;
    const z = Math.cos(t * Math.PI * 0.5) * lean * 0.4 * height;
    const rTop = 0.28 - t * 0.1;
    const rBot = 0.36 - t * 0.1;
    const segH = height / segments;

    const ring = cylinder(rTop, rBot, segH, i % 2 ? 0x8a6e4d : 0x765c3e, 0, segH / 2, 0, 7);
    const segGroup = new T.Group();
    segGroup.position.copy(prevPos);
    segGroup.lookAt(x, y, z);
    segGroup.rotateX(Math.PI / 2);
    segGroup.add(ring);
    g.add(segGroup);
    prevPos.set(x, y, z);
  }

  const greens = [0x3b7538, 0x4f8742, 0x619846, 0x487a38];
  const frondCount = 8;
  for (let n = 0; n < frondCount; n++) {
    const a = (n / frondCount) * Math.PI * 2 + seed * 0.4;
    const frond = new T.Group();
    frond.position.copy(prevPos);

    const len = 3.6 + (n % 2) * 0.6;
    const shape = new T.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(len * 0.4, 0.4, len, 0);
    shape.quadraticCurveTo(len * 0.5, -0.4, 0, 0);

    const leafMesh = new T.Mesh(new T.ShapeGeometry(shape), mat(greens[n % greens.length], { side: T.DoubleSide }));
    leafMesh.rotation.set(-Math.PI / 2, 0, a);
    leafMesh.rotation.x += 0.38 + (n % 3) * 0.08;
    leafMesh.castShadow = true;
    frond.add(leafMesh);
    g.add(frond);
  }

  for (let c = 0; c < 3; c++) {
    const ca = (c / 3) * Math.PI * 2;
    g.add(sphere(0.32, 0x6e4e2a, prevPos.x + Math.cos(ca) * 0.38, prevPos.y - 0.35, prevPos.z + Math.sin(ca) * 0.38));
  }
  return g;
}

export function deciduousTree(seed = 0) {
  const g = new T.Group();
  const height = 5.2 + Math.sin(seed * 7) * 0.6;
  g.add(cylinder(0.35, 0.55, height, 0x6c5138, 0, height / 2, 0, 7));
  const foliageColors = [0x507d3b, 0x649444, 0x76a34c];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + seed;
    const dist = 1.1 + Math.sin(i * 3) * 0.4;
    const yOff = height + (i === 0 ? 0.8 : (i % 2) * 0.2);
    const radius = 1.6 + (i === 0 ? 0.6 : 0);
    g.add(sphere(radius, foliageColors[i % foliageColors.length], Math.cos(a) * (i ? dist : 0), yOff, Math.sin(a) * (i ? dist : 0)));
  }
  return g;
}

export function pineTree(seed = 0) {
  const g = new T.Group();
  const height = 6.5;
  g.add(cylinder(0.2, 0.45, height * 0.4, 0x5a422e, 0, height * 0.2, 0, 6));
  for (let l = 0; l < 4; l++) {
    const t = l / 4;
    const y = 2.2 + l * 1.35;
    const r = 2.2 * (1 - t * 0.6);
    g.add(cylinder(0.1, r, 1.8, 0x3d5c3f, 0, y, 0, 7));
  }
  return g;
}

export function tree(seed = 0, palm = true) {
  if (palm) return palmTree(seed);
  return seed % 3 === 0 ? pineTree(seed) : deciduousTree(seed);
}

export function rock(seed = 0, size = 1) {
  const r = new T.Mesh(new T.DodecahedronGeometry(size, 1), mat(seed % 2 ? 0x8f8c79 : 0xa49e85, { roughness: 0.9 }));
  r.scale.set(1.2 + (seed % 3) * 0.2, 0.75 + (seed % 2) * 0.3, 1.1);
  r.rotation.set(seed * 0.7, seed * 0.4, 0.2);
  r.castShadow = true;
  r.receiveShadow = true;
  return r;
}

export function barrel() {
  const g = new T.Group();
  g.add(cylinder(0.56, 0.5, 1.35, 0x8b6138, 0, 0.65, 0, 9));
  for (const y of [0.22, 1.05]) {
    g.add(cylinder(0.57, 0.57, 0.09, 0x3d3930, 0, y, 0, 9));
  }
  return g;
}

export function crate() {
  const g = new T.Group();
  g.add(box(1.35, 1.35, 1.35, 0xaa864e, 0, 0.68, 0));
  for (const y of [0.14, 1.22]) {
    g.add(box(1.42, 0.12, 1.42, 0x7a5b34, 0, y, 0));
  }
  const cross = box(0.12, 1.48, 0.08, 0x6e4e2a, 0, 0.68, 0.7);
  cross.rotation.z = 0.78;
  g.add(cross);
  return g;
}

export function lanternPost(lit = true) {
  const g = new T.Group();
  g.add(cylinder(0.1, 0.14, 3.4, 0x483e32, 0, 1.7, 0, 6));
  const arm = box(0.8, 0.1, 0.1, 0x483e32, 0.35, 3.3, 0);
  g.add(arm);
  const lantern = new T.Group();
  lantern.position.set(0.65, 3.1, 0);
  lantern.add(box(0.32, 0.42, 0.32, lit ? 0xffdf80 : 0x768782, 0, 0, 0, lit ? { emissive: 0xffb84d, emissiveIntensity: 0.6 } : {}));
  lantern.add(cylinder(0.24, 0.24, 0.08, 0x332e26, 0, 0.24, 0, 4));
  g.add(lantern);
  return g;
}

export function fishDryingRack() {
  const g = new T.Group();
  g.add(cylinder(0.08, 0.08, 2.2, 0x7d654c, -1.8, 1.1, 0));
  g.add(cylinder(0.08, 0.08, 2.2, 0x7d654c, 1.8, 1.1, 0));
  const bar = cylinder(0.07, 0.07, 3.8, 0x8b7054, 0, 2.05, 0);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  for (let i = -1.3; i <= 1.3; i += 0.55) {
    const f = cylinder(0.14, 0.02, 0.8, 0x93aaa2, i, 1.4, 0, 4);
    f.rotation.z = Math.PI;
    g.add(f);
  }
  return g;
}

export function shipwreck() {
  const g = new T.Group();
  const brokenHull = box(4.5, 2.2, 7.5, 0x4e3e30, 0, 0.2, 0);
  brokenHull.rotation.set(0.35, 0.4, -0.3);
  g.add(brokenHull);
  const mast = cylinder(0.2, 0.35, 5, 0x5a4838, 1.2, 1.5, -0.8);
  mast.rotation.set(0.6, 0, 0.5);
  g.add(mast);
  const b1 = barrel();
  b1.position.set(-2.5, -0.1, 2.2);
  b1.rotation.x = 1.2;
  g.add(b1);
  return g;
}

export function salvageFlotsam() {
  const g = new T.Group();
  const b = barrel();
  b.position.set(0, 0.1, 0);
  b.rotation.x = 0.5;
  g.add(b);
  const crateMesh = crate();
  crateMesh.position.set(1.4, 0.1, -0.4);
  crateMesh.scale.setScalar(0.75);
  g.add(crateMesh);
  g.add(cylinder(0.12, 0.12, 1.8, 0xa93d3d, -1, 0.8, 0.8));
  g.add(box(0.6, 0.4, 0.04, 0xf0c850, -0.7, 1.5, 0.8));
  return g;
}

export function ancientRuin() {
  const g = new T.Group();
  g.add(cylinder(0.6, 0.7, 4.5, 0x8a9286, -2.5, 2.25, 0, 8));
  g.add(cylinder(0.6, 0.7, 4.5, 0x8a9286, 2.5, 2.25, 0, 8));
  g.add(box(6.2, 0.9, 1.4, 0x7c8477, 0, 4.8, 0));
  g.add(cylinder(1.6, 1.9, 0.8, 0x70796c, 0, 0.4, 0, 6));
  const crystal = sphere(0.48, 0x52d3c9, 0, 1.2, 0, 1, { emissive: 0x2bbab0, emissiveIntensity: 0.7 });
  g.add(crystal);
  return g;
}

export function house(roofColor = 0xbb7250, variant = 0, theme = 'default') {
  const g = new T.Group();
  const w = 6 + (variant % 3);
  const h = 4 + (variant % 2) * 2;
  const d = 5;

  let wallColor = variant % 2 ? 0xe2d6ba : 0xeee4cb;
  if (theme === 'foundry') wallColor = 0x8d8a83;
  if (theme === 'pirate') wallColor = 0x6e6357;
  g.add(box(w, h, d, wallColor, 0, h / 2, 0));
  g.add(box(w + 0.35, 0.45, d + 0.3, 0x8c8371, 0, 0.22, 0));

  for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) {
    for (const z of [-d / 2 + 0.15, d / 2 - 0.15]) {
      g.add(box(0.35, h, 0.35, 0x634f3a, x, h / 2, z));
    }
  }

  const shape = new T.Shape();
  shape.moveTo(-w / 2 - 0.65, 0);
  shape.lineTo(0, 2.9);
  shape.lineTo(w / 2 + 0.65, 0);
  shape.closePath();

  const roofGeo = new T.ExtrudeGeometry(shape, { depth: d + 1.2, bevelEnabled: false });
  const roof = new T.Mesh(roofGeo, mat(roofColor));
  roof.position.set(0, h, -d / 2 - 0.6);
  roof.castShadow = true;
  g.add(roof);

  const door = box(1.2, 2.15, 0.16, 0x584430, 0, 1.08, d / 2 + 0.04);
  g.add(door);

  for (const x of [-w * 0.3, w * 0.3]) {
    g.add(box(0.95, 1.25, 0.14, 0x8bb8b0, x, h * 0.6, d / 2 + 0.04, { emissive: 0xffebaa, emissiveIntensity: 0.18 }));
  }

  const chimneyH = theme === 'foundry' ? 4.8 : 2.6;
  g.add(box(1.0, chimneyH, 1.0, 0x766a5c, w * 0.32, h + chimneyH / 2 - 0.4, -0.9));

  if (variant === 1 || theme === 'merchant') {
    const awning = box(w - 0.8, 0.14, 2.8, theme === 'merchant' ? 0x9b483c : 0x487665, 0, 2.75, d / 2 + 1.2);
    awning.rotation.x = 0.18;
    g.add(awning);
  }
  return g;
}

export function tower(hostile = true) {
  const g = new T.Group();
  g.add(cylinder(3.7, 4.4, 7.8, hostile ? 0x73695c : 0xb5b098, 0, 3.9, 0, 10));
  g.add(cylinder(4.2, 4.2, 0.6, hostile ? 0x8a7e6f : 0xc7c2a7, 0, 8.0, 0, 10));

  for (let n = 0; n < 8; n++) {
    const a = (n / 8) * Math.PI * 2;
    g.add(box(1.2, 1.35, 1.2, hostile ? 0x7d7364 : 0xbdb99f, Math.cos(a) * 3.6, 8.9, Math.sin(a) * 3.6));
  }

  const gunCarriage = box(1.4, 0.8, 1.8, 0x523d2c, 0, 8.6, 1.4);
  g.add(gunCarriage);
  const gun = cylinder(0.42, 0.52, 3.8, 0x363833, 0, 8.8, 2.4, 8);
  gun.rotation.x = Math.PI / 2;
  g.add(gun);

  g.add(cylinder(0.09, 0.09, 6.2, 0x6e5c46, 0, 11.0, 0));
  const flag = box(2.4, 1.2, 0.06, hostile ? 0x9e3c28 : 0x427552, 1.2, 13.2, 0);
  g.add(flag);
  g.userData.flag = flag;
  return g;
}

export function windmill() {
  const g = house(0x86613f, 2);
  g.add(cylinder(1.9, 2.6, 6.8, 0xdfd3b7, 0, 7.6, -0.4, 8));
  g.add(cylinder(0.2, 2.1, 1.8, 0x8a633d, 0, 11.9, -0.4, 8));

  const blades = new T.Group();
  for (let n = 0; n < 4; n++) {
    const spar = cylinder(0.08, 0.08, 4.6, 0x634f3b, 0, 2.3, 0);
    const canvas = box(0.9, 3.8, 0.08, 0xf0e6cb, 0.45, 2.4, 0.02);
    const pivot = new T.Group();
    pivot.add(spar);
    pivot.add(canvas);
    pivot.rotation.z = n * Math.PI / 2;
    blades.add(pivot);
  }
  blades.position.set(0, 10.2, 1.6);
  g.add(blades);
  g.userData.blades = blades;
  return g;
}

// Character with Iconic Round Straw Hat & Fishing Rod (Matching Reference Screenshot)
export function person(color = 0xac543c, seed = 0, role = 'default') {
  const g = new T.Group();
  const body = new T.Group();

  // Torso / Kimono / Vest
  body.add(box(0.92, 1.15, 0.58, color, 0, 1.55, 0));
  // Sash belt
  body.add(box(0.96, 0.22, 0.64, 0x483a2c, 0, 1.08, 0));

  // Head and neck
  const skinTone = 0xd9b38c;
  body.add(sphere(0.38, skinTone, 0, 2.28, 0));
  body.add(cylinder(0.14, 0.22, 0.28, skinTone, 0, 2.02, 0));

  // Round Straw Fisherman Hat (Conical Straw Hat from reference screenshot!)
  const strawHat = new T.Group();
  strawHat.position.set(0, 2.58, 0);
  // Wide circular sloping brim
  const brim = cylinder(1.15, 1.35, 0.16, 0xd8bc7a, 0, 0, 0, 20);
  strawHat.add(brim);
  // Conical top crown
  const crown = cylinder(0.2, 0.85, 0.38, 0xc8aa60, 0, 0.22, 0, 16);
  strawHat.add(crown);
  // Blue center ring / crown accent from reference screenshot
  const blueRing = cylinder(0.48, 0.52, 0.1, 0x2d6888, 0, 0.26, 0, 16);
  strawHat.add(blueRing);
  // Top peak
  const peak = sphere(0.12, 0xd8bc7a, 0, 0.44, 0);
  strawHat.add(peak);
  body.add(strawHat);

  // Woven fish creel / wicker basket slung over shoulder (matching reference image)
  const creelBasket = box(0.52, 0.62, 0.4, 0x8a5d35, 0, 1.45, -0.42);
  body.add(creelBasket);

  // Limbs
  const limbs = [];
  // Legs
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.24, 1.05, 0);
    leg.add(box(0.32, 0.7, 0.36, 0x3d4b45, 0, -0.35, 0));
    leg.add(box(0.36, 0.34, 0.56, 0x483d31, 0, -0.78, 0.08));
    body.add(leg);
    limbs.push(leg);
  }

  // Arms
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * 0.58, 1.95, 0);
    arm.add(box(0.28, 0.62, 0.32, color, 0, -0.31, 0));
    arm.add(sphere(0.16, skinTone, 0, -0.68, 0));
    body.add(arm);
    limbs.push(arm);
  }

  // Wooden Fishing Rod in Hand (matching reference screenshot)
  const fishingRod = new T.Group();
  fishingRod.position.set(0.68, 1.6, 0.25);
  fishingRod.rotation.x = -0.55;
  fishingRod.rotation.z = -0.15;
  // Bamboo / wood rod
  const rodPole = cylinder(0.04, 0.08, 2.8, 0x855f3e, 0, 1.2, 0);
  fishingRod.add(rodPole);
  // Reel mount
  fishingRod.add(cylinder(0.1, 0.1, 0.14, 0x3b3a36, 0, 0.35, 0.1));
  body.add(fishingRod);

  g.add(body);
  g.userData = { limbs, body, seed, fishingRod, strawHat };
  return g;
}

// Ships: Skiff (Tier 0), Cutter (Tier 1), Corsair raiders
export function ship({ enemy = false, tier = 0, cannon = 0, merchant = false } = {}) {
  if (!tier && !enemy && !merchant) {
    return rowboat();
  }
  const g = new T.Group();
  const length = tier ? 11.2 : 7.2;
  const width = tier ? 4.2 : 3.0;

  const vertices = [];
  const indices = [];
  const profile = [
    [-0.5, 0.32],
    [-0.32, 0.95],
    [0.12, 1.0],
    [0.36, 0.76],
    [0.5, 0.05]
  ];

  for (const [z, spread] of profile) {
    for (const [x, y] of [[-1, 1], [-0.68, 0], [0.68, 0], [1, 1]]) {
      vertices.push(x * width * 0.5 * spread, y * 0.98 + 0.15, z * length);
    }
  }

  for (let n = 0; n < profile.length - 1; n++) {
    for (let p = 0; p < 3; p++) {
      const a = n * 4 + p;
      const b = a + 4;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  let hullColor = enemy ? 0x484239 : (merchant ? 0x76543b : (tier ? 0x6e4e32 : 0x8e643b));
  const hullMesh = new T.Mesh(geometry, mat(hullColor, { side: T.DoubleSide }));
  hullMesh.castShadow = true;
  g.add(hullMesh);

  g.add(box(width * 0.75, 0.16, length * 0.76, 0xcab180, 0, 1.05, -0.2));
  for (const side of [-1, 1]) {
    g.add(box(0.14, 0.35, length * 0.74, 0x5e4228, side * width * 0.43, 1.25, -0.2));
  }

  const sails = [];
  const masts = tier ? [-2.6, 1.4] : [0.15];

  for (const mastZ of masts) {
    const mastHeight = tier ? 7.8 : 5.6;
    g.add(cylinder(0.08, 0.15, mastHeight, 0x7a6344, 0, mastHeight / 2 + 1, mastZ));

    const sailW = width * 1.55;
    const sailH = mastHeight * 0.58;
    const sailGeo = new T.PlaneGeometry(sailW, sailH, 8, 8);
    const pos = sailGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.cos(x / sailW * Math.PI) * 0.58 + Math.sin(y * 0.6) * 0.09);
    }
    sailGeo.computeVertexNormals();

    let sailColor = enemy ? 0x3d3834 : (merchant ? 0xedf0e4 : 0xf4ecd8);
    const sailMesh = new T.Mesh(sailGeo, mat(sailColor, { side: T.DoubleSide }));
    sailMesh.position.set(0, mastHeight * 0.68 + 1, mastZ);
    sailMesh.castShadow = true;
    g.add(sailMesh);
    sails.push(sailMesh);

    const spar = cylinder(0.06, 0.06, sailW * 1.05, 0x7a6344, 0, mastHeight * 0.95, mastZ);
    spar.rotation.z = Math.PI / 2;
    g.add(spar);
  }

  if (tier) {
    const bowsprit = cylinder(0.07, 0.12, 3.8, 0x7a6344, 0, 1.8, length * 0.52);
    bowsprit.rotation.x = -Math.PI / 4;
    g.add(bowsprit);
    const wheelStand = cylinder(0.08, 0.08, 1.0, 0x5a432e, 0, 1.6, -3.8);
    g.add(wheelStand);
    const wheel = cylinder(0.48, 0.48, 0.06, 0xbba066, 0, 2.1, -3.7, 8);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel);
  }

  const cannonCount = enemy ? 2 : (tier ? Math.max(1, cannon) : cannon);
  if (cannonCount > 0) {
    const sides = tier ? [-1, 1] : [1];
    for (const side of sides) {
      for (let c = 0; c < Math.min(cannonCount, 3); c++) {
        const cz = (c - (cannonCount - 1) / 2) * 1.5;
        g.add(box(0.55, 0.38, 0.55, 0x6e4e34, side * (width * 0.32), 1.3, cz));
        const gun = cylinder(0.15, 0.22, 1.7, 0x3a3d3a, side * (width * 0.44), 1.58, cz, 8);
        gun.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        g.add(gun);
      }
    }
  }

  g.userData = { sails, length, width };
  return g;
}

export function islandMesh(island) {
  const count = 72;
  const vertices = [];
  const colors = [];
  const indices = [];

  const rings = [
    { scale: 1.16, y: -0.05, color: 0xd6cbb0 },
    { scale: 1.06, y: 0.32, color: 0xdfcb9b },
    { scale: 0.98, y: 1.65, color: 0x9cb075 },
    { scale: 0.88, y: 2.35, color: island.color },
    { scale: 0.62, y: 3.10, color: island.color }
  ];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    for (let n = 0; n < count; n++) {
      const a = (n / count) * Math.PI * 2;
      const factor = 1.0 +
        0.055 * Math.sin(a * 4 + island.seed * 1.3) +
        0.040 * Math.cos(a * 6 + island.seed * 0.8) +
        0.025 * Math.sin(a * 9 + island.seed * 2.1);

      const vx = Math.cos(a) * island.rx * factor * ring.scale;
      const vz = Math.sin(a) * island.rz * factor * ring.scale;
      const vy = ring.y + 0.18 * Math.sin(a * 3 + island.seed);

      vertices.push(vx, vy, vz);

      const baseCol = new T.Color(ring.color);
      const noise = 0.94 + 0.08 * Math.sin(n * 4 + r * 2 + island.seed);
      baseCol.multiplyScalar(noise);
      colors.push(baseCol.r, baseCol.g, baseCol.b);
    }
  }

  vertices.push(0, 3.4, 0);
  const summitCol = new T.Color(island.color).multiplyScalar(1.05);
  colors.push(summitCol.r, summitCol.g, summitCol.b);
  const centerIdx = rings.length * count;

  for (let r = 0; r < rings.length - 1; r++) {
    for (let n = 0; n < count; n++) {
      const a = r * count + n;
      const b = r * count + (n + 1) % count;
      const c = a + count;
      const d = b + count;
      indices.push(a, c, b, b, c, d);
    }
  }

  const lastRingStart = (rings.length - 1) * count;
  for (let n = 0; n < count; n++) {
    indices.push(centerIdx, lastRingStart + (n + 1) % count, lastRingStart + n);
  }

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    flatShading: true,
    side: T.DoubleSide
  }));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
