export function createLifeDetails(ctx) {
  const { THREE, materials, box, cylinder, applyShadows, rand, createWoodPile, createFirePit } = ctx;
  const group = new THREE.Group();

  function createBucket(material = materials.bluePlastic) {
    const bucket = new THREE.Group();
    const body = cylinder(0.18, 0.22, 0.36, material, 24);
    body.position.y = 0.18;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.014, 8, 24), materials.dark);
    rim.position.y = 0.37;
    rim.rotation.x = Math.PI / 2;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.01, 8, 24, Math.PI), materials.frame);
    handle.position.y = 0.4;
    bucket.add(body, rim, handle);
    return bucket;
  }

  function createTool(angle = -14) {
    const tool = new THREE.Group();
    const handle = cylinder(0.018, 0.018, 1.28, new THREE.MeshStandardMaterial({ color: '#9a6536', roughness: 0.9 }), 8);
    handle.rotation.z = THREE.MathUtils.degToRad(angle);
    handle.position.y = 0.68;
    const head = box(0.34, 0.035, 0.08, materials.dark, Math.sin(THREE.MathUtils.degToRad(angle)) * 0.48, 0.12, 0);
    tool.add(handle, head);
    return tool;
  }

  function createElectricBike() {
    const bike = new THREE.Group();
    const wheelMat = materials.rubber;
    [-0.46, 0.46].forEach(x => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 10, 28), wheelMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(x, 0.2, 0);
      bike.add(wheel);
    });
    const frame = box(0.82, 0.08, 0.08, materials.frame, 0, 0.42, 0);
    const seat = box(0.28, 0.055, 0.2, materials.rubber, 0.12, 0.62, 0);
    const handle = cylinder(0.018, 0.018, 0.48, materials.frame, 8);
    handle.rotation.z = THREE.MathUtils.degToRad(-22);
    handle.position.set(0.5, 0.64, 0);
    const basket = box(0.23, 0.18, 0.24, materials.dark, 0.66, 0.5, 0);
    const shell = box(0.56, 0.2, 0.18, materials.bluePlastic, -0.08, 0.42, 0);
    bike.add(frame, seat, handle, basket, shell);
    bike.rotation.y = THREE.MathUtils.degToRad(-9);
    return bike;
  }

  function createBambooBasket() {
    const basket = new THREE.Group();
    const weaveMat = new THREE.MeshStandardMaterial({ color: '#b98b48', roughness: 0.98 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.028, 8, 28), weaveMat);
    rim.position.y = 0.38;
    rim.rotation.x = Math.PI / 2;
    const body = cylinder(0.27, 0.34, 0.36, weaveMat, 18);
    body.position.y = 0.18;
    body.scale.y = 0.86;
    for (let i = 0; i < 9; i += 1) {
      const angle = i / 9 * Math.PI * 2;
      const rib = box(0.018, 0.34, 0.018, materials.wood, Math.cos(angle) * 0.29, 0.21, Math.sin(angle) * 0.29);
      rib.rotation.y = -angle;
      basket.add(rib);
    }
    basket.add(body, rim);
    return basket;
  }

  function createSack(color = '#d4c08d') {
    const sack = new THREE.Group();
    const sackMat = new THREE.MeshStandardMaterial({ color, roughness: 1 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), sackMat);
    body.scale.set(0.88, 1.25, 0.7);
    body.position.y = 0.28;
    const tie = cylinder(0.055, 0.08, 0.08, materials.wood, 10);
    tie.position.y = 0.62;
    sack.add(body, tie);
    return applyShadows(sack);
  }

  function createBroom() {
    const broom = new THREE.Group();
    const handle = cylinder(0.018, 0.018, 1.35, materials.wood, 8);
    handle.rotation.z = THREE.MathUtils.degToRad(-26);
    handle.position.set(0.12, 0.68, 0);
    const strawHead = box(0.34, 0.2, 0.12, materials.straw, -0.18, 0.13, 0);
    strawHead.rotation.z = THREE.MathUtils.degToRad(-8);
    broom.add(handle, strawHead);
    return broom;
  }

  function createHoseCoil() {
    const hose = new THREE.Group();
    const hoseMat = new THREE.MeshStandardMaterial({ color: '#1f8a5b', roughness: 0.58 });
    for (let i = 0; i < 3; i += 1) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.3 + i * 0.07, 0.015, 8, 36), hoseMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.y = 0.035 + i * 0.006;
      hose.add(coil);
    }
    const loose = box(0.86, 0.026, 0.035, hoseMat, 0.52, 0.04, 0.15);
    loose.rotation.y = THREE.MathUtils.degToRad(-18);
    hose.add(loose);
    return hose;
  }

  function createClothesline() {
    const line = new THREE.Group();
    const postA = cylinder(0.035, 0.04, 1.25, materials.wood, 10);
    const postB = postA.clone();
    postA.position.set(-1.4, 0.62, 0);
    postB.position.set(1.4, 0.62, 0);
    const ropeGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.4, 1.18, 0),
      new THREE.Vector3(1.4, 1.18, 0)
    ]);
    const rope = new THREE.Line(ropeGeom, new THREE.LineBasicMaterial({ color: '#d7c08a' }));
    const clothA = box(0.38, 0.42, 0.025, materials.red, -0.55, 0.92, 0.01);
    const clothB = box(0.46, 0.36, 0.025, materials.bluePlastic, 0.22, 0.94, 0.01);
    const clothC = box(0.34, 0.32, 0.025, materials.yellowPlastic, 0.85, 0.96, 0.01);
    line.add(postA, postB, rope, clothA, clothB, clothC);
    return line;
  }

  function createUtilityLine() {
    const utility = new THREE.Group();
    const pole = cylinder(0.07, 0.09, 2.4, materials.wood, 12);
    pole.position.set(-7.55, 1.2, 5.55);
    const crossArm = box(1.0, 0.07, 0.08, materials.wood, -7.55, 2.28, 5.55);
    const wireMat = new THREE.LineBasicMaterial({ color: '#1b2324', transparent: true, opacity: 0.78 });
    const addWire = (points) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)), wireMat);
      utility.add(wire);
    };
    addWire([
      new THREE.Vector3(-7.95, 2.26, 5.55),
      new THREE.Vector3(-6.8, 2.1, 5.8),
      new THREE.Vector3(-5.08, 3.08, 5.92)
    ]);
    addWire([
      new THREE.Vector3(-7.15, 2.26, 5.55),
      new THREE.Vector3(-6.35, 2.02, 5.55),
      new THREE.Vector3(-4.45, 2.86, 5.98)
    ]);
    utility.add(pole, crossArm);
    return utility;
  }

  function addWeedPatch(cx, cz, count = 12) {
    for (let i = 0; i < count; i += 1) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.22 + rand() * 0.18, 5), materials.leaf);
      blade.position.set(cx + (rand() - 0.5) * 0.8, 0.18, cz + (rand() - 0.5) * 0.8);
      blade.rotation.z = (rand() - 0.5) * 0.45;
      blade.castShadow = true;
      group.add(blade);
    }
  }

  const ebike = createElectricBike();
  ebike.position.set(-4.7, 0.22, 6.45);
  group.add(ebike);

  const bucketA = createBucket(materials.bluePlastic);
  bucketA.position.set(-5.65, 0.24, 4.1);
  const bucketB = createBucket(materials.greenPlastic);
  bucketB.scale.set(0.78, 0.78, 0.78);
  bucketB.position.set(-5.2, 0.24, 3.78);
  group.add(bucketA, bucketB);

  const toolA = createTool(-18);
  toolA.position.set(8.8, 0.18, -6.85);
  const toolB = createTool(10);
  toolB.position.set(9.15, 0.18, -7.18);
  group.add(toolA, toolB);

  const stool = new THREE.Group();
  stool.add(box(0.48, 0.08, 0.36, materials.wood, 0, 0.42, 0));
  [-0.18, 0.18].forEach(x => [-0.12, 0.12].forEach(z => stool.add(box(0.055, 0.42, 0.055, materials.wood, x, 0.21, z))));
  stool.position.set(4.8, 0.18, 6.35);
  group.add(stool);

  const basket = createBambooBasket();
  basket.position.set(3.85, 0.22, 7.1);
  const sackA = createSack('#d7c28d');
  sackA.position.set(5.45, 0.18, 5.85);
  sackA.rotation.y = THREE.MathUtils.degToRad(13);
  const sackB = createSack('#c5b27f');
  sackB.scale.set(0.8, 0.82, 0.8);
  sackB.position.set(5.85, 0.17, 5.98);
  group.add(basket, sackA, sackB);

  const line = createClothesline();
  line.position.set(0.4, 0.12, -8.15);
  group.add(line);

  const woodPile = createWoodPile(1.08, 4);
  woodPile.rotation.y = THREE.MathUtils.degToRad(8);
  woodPile.position.set(-4.55, 0.12, -8.0);
  const tarp = box(1.65, 0.04, 0.62, materials.tarp, -4.55, 0.78, -8.02);
  tarp.rotation.z = THREE.MathUtils.degToRad(-3);
  group.add(woodPile, tarp, createUtilityLine());

  const firePit = createFirePit();
  firePit.position.set(-3.35, 0.14, -7.55);
  group.add(firePit);

  const broom = createBroom();
  broom.position.set(7.18, 0.16, -6.78);
  broom.rotation.y = THREE.MathUtils.degToRad(12);
  const hose = createHoseCoil();
  hose.position.set(6.58, 0.18, -8.55);
  group.add(broom, hose);

  const jar = cylinder(0.24, 0.28, 0.58, new THREE.MeshStandardMaterial({ color: '#8b5a38', roughness: 0.9 }), 18);
  jar.position.set(6.75, 0.31, -5.8);
  group.add(jar);

  const shoes = new THREE.Group();
  [-0.16, 0.16].forEach((x, i) => {
    const shoe = box(0.22, 0.055, 0.46, materials.rubber, x, 0.06, i ? 0.08 : -0.02);
    shoe.rotation.y = THREE.MathUtils.degToRad(i ? 7 : -5);
    shoes.add(shoe);
  });
  shoes.position.set(1.0, 0.22, 6.18);
  group.add(shoes);

  addWeedPatch(-6.15, 3.1, 14);
  addWeedPatch(8.25, -5.25, 12);
  addWeedPatch(8.2, 7.7, 10);
  addWeedPatch(-6.9, 9.6, 10);

  return applyShadows(group);
}
