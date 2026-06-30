<template>
  <div class="walk-hud" :style="{ display: cityModeState.mode === 'walk' || cityModeState.mode === 'guided' ? 'block' : 'none' }">
    <div class="joy-zone"><span></span></div>
    <button class="view-toggle" type="button" @click="toggleView">{{ cityModeState.personView === 'first' ? '第三视角' : '第一视角' }}</button>
    <div class="look-hint">TvT 组件化版本 · 漫游控制下一步接入</div>
  </div>
</template>

<script setup>
import { cityModeState } from '../../stores/cityMode.js';
function toggleView() {
  cityModeState.personView = cityModeState.personView === 'first' ? 'third' : 'first';
}
</script>
