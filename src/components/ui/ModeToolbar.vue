<template>
  <nav class="toolbar" aria-label="展示模式">
    <button
      v-for="mode in modes"
      :key="mode.value"
      :class="{ active: cityModeState.mode === mode.value }"
      type="button"
      @click="setMode(mode.value)"
    >
      {{ mode.label }}
    </button>
  </nav>
</template>

<script setup>
import { cityModeState } from '../../stores/cityMode.js';

const modes = [
  { value: 'overview', label: '沙盘总览' },
  { value: 'walk', label: '沉浸漫游' },
  { value: 'guided', label: '自动导览' },
  { value: 'eco', label: '生态运行' },
  { value: 'map', label: '标注地图' }
];

function setMode(mode) {
  if (mode === 'eco') {
    cityModeState.ecologyRunning = !cityModeState.ecologyRunning;
    cityModeState.mode = 'eco';
    window.setTimeout(() => {
      if (cityModeState.mode === 'eco') cityModeState.mode = 'overview';
    }, 700);
    return;
  }
  cityModeState.mode = mode;
}
</script>
