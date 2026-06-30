export function canvasTexture(THREE, draw, width = 512, height = 512) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function sharpenTexture(THREE, texture) {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function pixelTexture(THREE, rand, base, accents = [], size = 16) {
  return canvasTexture(THREE, (ctx, w, h) => {
    const cell = w / size;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const color = accents[Math.floor(rand() * accents.length)] || base;
        if (rand() > 0.42) {
          ctx.fillStyle = color;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = cell * 0.18;
    for (let i = 0; i <= size; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
    }
  }, 128, 128);
}
