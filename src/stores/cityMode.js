import { reactive } from 'vue';

export const cityModeState = reactive({
  mode: 'overview',
  ecologyRunning: true,
  personView: 'third',
  loadingText: '准备加载 TvT 城市场景'
});
