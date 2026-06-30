<template>
  <aside class="detail-card">
    <b>{{ copy.title }}</b>
    <span>{{ copy.text }}</span>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { cityModeState } from '../../stores/cityMode.js';

const modeCopy = {
  overview: {
    title: 'TvT 总览：统一比例小城',
    text: '当前主场景已切到 TresJS 声明式组件：道路、水系、建筑、分区和道具都由 Vue 数据驱动。'
  },
  walk: {
    title: '沉浸漫游：轻量相机位',
    text: '这一阶段先完成组件化和比例统一，后续可把第一/第三人称控制接入 Vue store。'
  },
  guided: {
    title: '自动导览：数据化路线',
    text: '导览路线已在数据层预留，可继续接入相机 tween，按老家→农田→村庄→古镇→游乐→CBD→学校播放。'
  },
  eco: {
    title: '生态运行：性能开关',
    text: cityModeState.ecologyRunning ? '生态细节开启，树木和道具数量保持完整。' : '生态细节已降级，减少部分树木与动态负载。'
  },
  map: {
    title: '标注地图：比例校验',
    text: '显示 1格=2m 的网格和各功能区色块，用于检查全城比例。'
  }
};
const copy = computed(() => modeCopy[cityModeState.mode] || modeCopy.overview);
</script>
