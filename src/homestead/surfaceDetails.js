export function createHouseSurfaceDetails(ctx) {
  const { THREE, materials, box } = ctx;
  const group = new THREE.Group();
  const dampMat = new THREE.MeshBasicMaterial({ color: '#6c756f', transparent: true, opacity: 0.2, depthWrite: false });
  const sootMat = new THREE.MeshBasicMaterial({ color: '#2d302b', transparent: true, opacity: 0.18, depthWrite: false });
  const limeMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false });
  const rustMat = new THREE.MeshBasicMaterial({ color: '#9b5a32', transparent: true, opacity: 0.22, depthWrite: false });
  const crackMat = new THREE.LineBasicMaterial({ color: '#3d423f', transparent: true, opacity: 0.36 });

  const addFacePatch = (width, height, x, y, z, material, rotationY = 0) => {
    const patch = box(width, height, 0.012, material, x, y, z);
    patch.rotation.y = rotationY;
    patch.userData.noShadow = true;
    patch.castShadow = false;
    patch.receiveShadow = false;
    group.add(patch);
    return patch;
  };

  const addCrack = (points) => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
      crackMat
    );
    line.userData.noShadow = true;
    group.add(line);
  };

  // 只加贴脸级旧化，不改主屋体块和门窗位置。
  [-4.9, 4.9].forEach((x, i) => {
    addFacePatch(1.35, 0.34, x, 1.02, 5.632, dampMat);
    addFacePatch(0.12, 0.78, x + (i ? 0.62 : -0.58), 1.1, 5.64, sootMat);
    addFacePatch(0.75, 0.045, x, 2.32, 5.646, limeMat);
  });
  [-7.08, 7.08].forEach((x) => {
    addFacePatch(0.16, 2.6, x, 1.7, 5.66, rustMat);
    addFacePatch(0.45, 0.18, x + Math.sign(x) * -0.12, 0.52, 5.652, dampMat);
  });
  addFacePatch(2.05, 0.28, 0, 0.52, 5.66, dampMat);
  addFacePatch(1.2, 0.16, -0.65, 3.0, 5.66, limeMat);
  addFacePatch(1.6, 0.2, -5.1, 1.05, -5.632, sootMat, Math.PI);
  addFacePatch(0.86, 0.3, -5.2, 2.66, -5.64, sootMat, Math.PI);
  addFacePatch(0.72, 0.2, -3.85, 0.62, -5.64, dampMat, Math.PI);

  addCrack([[-6.15, 3.08, 5.67], [-6.05, 2.76, 5.67], [-6.18, 2.5, 5.67], [-6.0, 2.18, 5.67]]);
  addCrack([[2.52, 2.94, 5.67], [2.66, 2.65, 5.67], [2.58, 2.32, 5.67]]);
  addCrack([[-7.62, 1.92, -2.0], [-7.64, 1.58, -2.2], [-7.61, 1.2, -2.04]]);

  const drain = box(0.78, 0.035, 0.18, materials.dark, -6.88, 0.18, 5.86);
  drain.userData.noShadow = true;
  group.add(drain);

  return group;
}
