<template>
  <canvas id="scene"></canvas>
  <div class="aurora-layer"></div>
  <div class="glow-grid"></div>
  <div class="render-badge" id="render-badge">检测 WebGPU...</div>
  <div class="load-status" id="load-status">正在启动梦幻 GIS 小城...</div>
  <header class="hero-only">
    <small>End-State Preview · GIS x Dream Twin</small>
    <h1>梦幻 GIS 小城</h1>
    <p>以真实 GIS 分层反推终局效果：地块、建筑、生态、人群与故事点全部叠加在一个可漫游的高细节数字小城里。</p>
    <div class="hero-metrics" aria-label="城市运行指标">
      <span><b>0.5m</b> 细节网格</span>
      <span><b>9</b> 场景分区</span>
      <span><b>24h</b> 昼夜仿真</span>
    </div>
  </header>

  <aside class="layer-panel" aria-label="GIS 图层">
    <strong>GIS 图层叠加</strong>
    <button class="layer active" data-layer="poi" type="button" aria-pressed="true">建筑 / POI</button>
    <button class="layer" data-layer="heat" type="button" aria-pressed="false">人流 / 热力</button>
    <button class="layer" data-layer="story" type="button" aria-pressed="false">节日 / 天气 / 故事</button>
  </aside>

  <aside class="ops-panel" aria-label="仿真状态">
    <div><b>城市心跳</b><span id="ops-heartbeat">运行中</span></div>
    <div><b>城市光效</b><span id="ops-dream">梦境强度 72%</span></div>
    <div><b>客流热度</b><span id="ops-heat">热力已关闭</span></div>
  </aside>

  <nav class="toolbar" aria-label="展示模式">
    <button class="active" data-mode="overview">终局总览</button>
    <button data-mode="walk">沉浸漫游</button>
    <button data-mode="guided">梦境导览</button>
    <button data-mode="eco">仿真运行</button>
    <button data-mode="map">GIS 叠加</button>
  </nav>
  <div class="walk-hud" id="walk-hud">
    <div class="joy-zone" id="joy-zone"><span id="joy-knob"></span></div>
    <button class="view-toggle" id="view-toggle" type="button">第三视角</button>
    <div class="look-hint">拖动右侧屏幕转向 · WASD / 摇杆移动</div>
  </div>
  <aside class="detail-card">
    <b id="detail-title">终局效果：梦幻小城数字孪生</b>
    <span id="detail-text">全城以 GIS 坐标为骨架，只叠加建筑 POI、人流热力和故事点；近景继续打磨老家房屋比例与生活细节，远景保持清透干净。</span>
  </aside>
</template>

<script setup>
import { onMounted } from 'vue';

onMounted(async () => {
  const loadStatus = document.querySelector('#load-status');
  try {
    await import('../../scene/originalVisualScene.js');
    if (loadStatus) {
      loadStatus.textContent = '梦幻 GIS 小城已启动';
      loadStatus.classList.add('done');
      setTimeout(() => loadStatus.remove(), 650);
    }
  } catch (error) {
    console.error('梦幻 GIS 小城加载失败', error);
    if (loadStatus) loadStatus.textContent = `场景加载失败：${error.message || error}`;
  }
});
</script>
