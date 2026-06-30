export function createGroundWearDetails(ctx) {
  const { THREE, box, cylinder, roundedPlane, applyShadows, rand } = ctx;
  const wear = new THREE.Group();
  const dustMat = new THREE.MeshBasicMaterial({ color: '#6f624f', transparent: true, opacity: 0.18, depthWrite: false });
  const wetMat = new THREE.MeshBasicMaterial({ color: '#5d6b66', transparent: true, opacity: 0.24, depthWrite: false });
  const gravelMat = new THREE.MeshStandardMaterial({ color: '#8b8272', roughness: 1 });

  for (let i = 0; i < 18; i += 1) {
    const tread = box(0.22 + rand() * 0.08, 0.012, 0.055, dustMat, -1.9 + i * 0.28, 0.336, 6.5 + Math.sin(i * 0.7) * 0.08);
    tread.rotation.y = THREE.MathUtils.degToRad(4 + Math.sin(i) * 5);
    tread.userData.noShadow = true;
    wear.add(tread);
  }

  [-0.28, 0.28].forEach(offset => {
    const track = box(7.8, 0.014, 0.04, dustMat, -1.5, 0.34, 6.95 + offset);
    track.rotation.y = THREE.MathUtils.degToRad(-4);
    track.userData.noShadow = true;
    wear.add(track);
  });

  const puddle = roundedPlane(1.1, 0.44, 0.2, wetMat);
  puddle.position.set(6.2, 0.342, -8.15);
  puddle.rotation.z = THREE.MathUtils.degToRad(-6);
  puddle.userData.noShadow = true;
  wear.add(puddle);

  for (let i = 0; i < 34; i += 1) {
    const pebble = cylinder(0.025 + rand() * 0.03, 0.028 + rand() * 0.035, 0.018, gravelMat, 7);
    pebble.position.set(-5.75 + (rand() - 0.5) * 0.7, 0.31, -4.8 + rand() * 11.0);
    pebble.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    wear.add(pebble);
  }

  return applyShadows(wear);
}
