<template>
  <canvas id="scene"></canvas>
  <div class="glow-grid"></div>
  <div class="render-badge" id="render-badge">检测 WebGPU...</div>
  <div class="load-status" id="load-status">正在恢复原视觉场景...</div>
  <header class="hero-only">
    <h1>老家 3D 平面还原</h1>
    <p>Vue/TvT 外壳迁移版：保留原 Three.js 视觉场景，不重做模型内容。</p>
  </header>
  <nav class="toolbar" aria-label="展示模式">
    <button class="active" data-mode="overview">沙盘总览</button>
    <button data-mode="walk">沉浸漫游</button>
    <button data-mode="guided">自动导览</button>
    <button data-mode="eco">生态运行</button>
    <button data-mode="map">标注地图</button>
  </nav>
  <div class="walk-hud" id="walk-hud">
    <div class="joy-zone" id="joy-zone"><span id="joy-knob"></span></div>
    <button class="view-toggle" id="view-toggle" type="button">第三视角</button>
    <div class="look-hint">拖动右侧屏幕转向 · WASD / 摇杆移动</div>
  </div>
  <aside class="detail-card">
    <b id="detail-title">结构未改：只增强颗粒度</b>
    <span id="detail-text">保留迁移前原 Three.js 场景视觉；Vue 只负责页面外壳，避免改变房子、道路和楼群观感。</span>
  </aside>
</template>

<script setup>
import { onMounted } from 'vue';

onMounted(async () => {
  const loadStatus = document.querySelector('#load-status');
  try {
    await import('../../scene/originalVisualScene.js');
    if (loadStatus) {
      loadStatus.textContent = '原视觉场景已恢复';
      loadStatus.classList.add('done');
      setTimeout(() => loadStatus.remove(), 650);
    }
  } catch (error) {
    console.error('原视觉场景加载失败', error);
    if (loadStatus) loadStatus.textContent = `场景加载失败：${error.message || error}`;
  }
});
</script>
