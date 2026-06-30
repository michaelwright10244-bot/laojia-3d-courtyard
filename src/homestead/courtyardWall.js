export function createCourtyardWall(ctx) {
  const { THREE, materials, plasterTexture, box } = ctx;
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: '#e4dfd2', map: plasterTexture, roughness: 0.94 });
  const capMat = new THREE.MeshStandardMaterial({ color: '#b8aa94', roughness: 0.88 });

  function addWallBetween(ax, az, bx, bz, height = 0.74) {
    const dx = bx - ax;
    const dz = bz - az;
    const length = Math.hypot(dx, dz);
    const cx = (ax + bx) / 2;
    const cz = (az + bz) / 2;
    const rot = -Math.atan2(dz, dx);
    const wall = box(length, height, 0.18, wallMat, cx, height / 2, cz);
    wall.rotation.y = rot;
    const cap = box(length + 0.14, 0.11, 0.32, capMat, cx, height + 0.055, cz);
    cap.rotation.y = rot;
    group.add(wall, cap);
  }

  // 后院围墙端点直接接到房屋后外墙，房屋外墙作为闭合边界的一边。
  addWallBetween(-7.5, -5.55, -7.5, -9.2);
  addWallBetween(-7.5, -9.2, 7.5, -9.28);
  addWallBetween(7.5, -9.28, 7.5, -6.65);
  addWallBetween(7.5, -5.45, 7.5, -5.55);

  const gateMat = new THREE.MeshStandardMaterial({ color: '#343b3c', roughness: 0.62, metalness: 0.16 });
  [-6.65, -5.45].forEach(z => {
    group.add(box(0.12, 1.0, 0.12, materials.frame, 7.5, 0.5, z));
  });
  const leftLeaf = box(0.06, 0.62, 0.46, gateMat, 7.51, 0.45, -6.36);
  const rightLeaf = box(0.06, 0.62, 0.46, gateMat, 7.51, 0.45, -5.76);
  const gateCap = box(0.16, 0.08, 1.42, capMat, 7.5, 1.04, -6.05);
  group.add(leftLeaf, rightLeaf, gateCap);
  return group;
}
