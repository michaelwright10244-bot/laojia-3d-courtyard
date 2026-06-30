# 老家 3D 宅院网页模型说明

当前版本是一个原生 ES Modules 的 Three.js 乡村自建房 3D 场景，页面壳为 `index.html`，样式在 `src/styles.css`，主脚本在 `src/main.js`。页面通过代码生成几何体、材质和纹理，不依赖 `test/` 下的参考照片素材。渲染层已升级到 Three.js r185 的 WebGPU 优先路径，浏览器不支持 WebGPU 时自动使用 WebGL 兼容后端。视觉方向调整为“老家完整虚拟小城”：老家主体保持写实简化，外围按统一尺度扩展农村、农田、教育、CBD、现代住宅、文旅古建、休闲游乐和自然景观带。


## TvT.js 架构迁移状态

当前采用“保留原视觉 + Vue/Vite 外壳”的迁移方式：

- 项目入口为 Vite + Vue3，`index.html` 只挂载 `#app` 和 `/src/main.js`。
- `src/components/scene/CityViewport.vue` 输出与迁移前一致的 DOM：`#scene`、工具栏、HUD、详情卡等 ID 和 `data-mode` 均保留。
- 原 Three.js 视觉场景已提取为 `src/scene/originalVisualScene.js`，由 Vue `onMounted()` 动态加载。
- 这样做的目标是只迁移代码工程结构，不改变房子、楼、道路和元素的视觉效果。
- 之前生成的简化 Tres 组件场景已移除，避免与原视觉场景混用。
- 已安装 `vue`、`vite`、`@vitejs/plugin-vue`、`three`、`@tresjs/core`、`@tresjs/cientos`；Tres 依赖保留给后续逐步迁移，但当前主视觉不再被重建。
- `start.sh` 已从 Python 静态服务改为 Vite dev server。

重要原则：后续如果继续迁移到 TresJS，只能逐个组件等价迁移，必须先截图/对照原视觉，不允许重做模型造型。

## 统一尺度规范

- `src/main.js` 里新增 `SCALE` 常量：1 格=2m、成人=0.9格、楼层=1.5格、乡路=1.75格、次干道=4.5格、主干道=8.25格。
- `标注地图` 模式会显示比例校验网格和 1.8m 成人参照物，用于检查学校、住宅、CBD、游乐区和老家的视觉比例。
- 新区建筑高度按楼层档位生成：平房/古建 1层，多层住宅 4-6层，小高层住宅 11-18层，CBD 高层 20-40层。


## 本轮城市扩展规格落实

本轮在 `src/scene/originalVisualScene.js` 原视觉场景上做加法扩展，不替换老家主体、不重画原有建筑：

- 新增 `SCALE`：1格=2m、楼层=1.5格、成人比例尺=0.9格，新增内容按该尺度生成。
- 新增 `createSpecRoadNetwork()`：主干道/次干道/乡间路分级，包含主轴、支路、环节点和车道线。
- 新增 `createSpecNaturalBand()`：贯穿城市的河流、大湖、池塘、现代桥/古桥/公园桥、山丘和树林。
- 新增 `createSpecCbdExpansion()`：按楼层档位补 CBD 高楼、购物中心、广场和喷泉。
- 新增 `createSpecResidentialDistrict()`：补小高层住宅、别墅区、老式多层住宅和中庭绿化。
- 新增 `createSpecEducationDistrict()`：补中小学/大学校园群、图书馆、宿舍楼、体育馆、操场。
- 新增 `createSpecHistoricDistrict()`：补古镇老街、牌坊、寺庙、宝塔、园林、小池。
- 新增 `createSpecLeisureDistrict()`：补湖岸公园、摩天轮、旋转木马和座椅。
- 新增 `createSpecFarmExpansion()`：补农家乐、果园、温室大棚和规模化田块。
- 新增 `createSpecScaleOverlay()`：标注地图里显示网格和 1.8m 成人比例尺。

原则：新增内容必须贴合原 low-poly 卡通风格，只做比例校准和内容补全，不能再替换原视觉场景。

## 当前完成的大概样子

- 整体是一个可旋转查看的农村自建房院落模型，保留原有房屋主体结构，不再按参考图随意重构房子。
- 主屋为白色/米白色抹灰墙面，黑色/深色门窗，主体屋顶仍保持当前版本的双坡屋顶表达。
- 背面右侧有一个凸出的厨房小体块，带窗户、排气孔和简单灶台/水槽表达。
- 后院围墙是一个四角不规则长方形，围墙端点与房屋外墙连接，形成闭合后院边界。
- 后院门位于右侧围墙靠上位置，门洞在围墙上断开，平面叠加里用黄色线段表示。
- 后院内部地面统一为单一水泥材质，不再有深浅不一的色块。
- 前院保留菜地、侧边小路、果树和少量生活物件，避免过度整洁。
- 场景中增加了少量生活元素：电动车、水桶、农具、小木凳、晾衣绳、陶缸、柴火垛、入户电线、排水管、炊烟、杂草等，用于增强生活感，但不改变房屋和围墙结构。
- 背景包含柔化远山、树线、远处村落、村庄生活区、农业区、学校/大学校园、CBD 高楼、现代住宅、古镇古塔、湖桥游乐、草地、薄雾和晴天氛围；底层地图已扩大，区域之间通过主干道、次干道、乡路和河湖桥梁系统拉开距离，避免只像单屏摆拍。
- 外围区域已叠加 `createFineDetailLayer()`：井盖、排水口、公交站、路灯、电线杆、村庄鸡鸭/菜筐/围栏、农田逐株苗/滴灌/稻草人/拖拉机、校园围栏/公告栏/自行车棚/课桌、城市交通灯/店招/空调外机/停车线等。

## 交互功能

页面底部有 5 个展示按钮：

- `沙盘总览`：从高处查看完整融合乡村世界。
- `沉浸漫游`：第一视角/第三视角进入世界，WASD 或安卓左下摇杆移动，右侧拖动转向，右下按钮可切换第一/第三视角。
- `自动导览`：相机沿主路低空穿行，依次展示老家、村庄、农场、学校和城市高楼。
- `生态运行`：暂停/恢复村民、农夫、城市小车、无人机、火光和炊烟等动态内容。
- `标注地图`：显示主屋结构、后院关系和各大区域的半透明分区标注。

沙盘模式下鼠标/触摸可直接旋转、缩放和拖拽查看模型；沉浸漫游模式下使用键盘或安卓触控摇杆移动。

## 当前结构要点

后续继续修改时请注意：

- 不要改变主屋基础结构，除非明确要求。
- 不要再按参考效果图重做房屋外形。
- 后院围墙应保持四角不规则长方形，不要改成多段复杂折线。
- 后院围墙端点需要与房屋外墙闭合，不能留缝。
- 后院门保持在右侧围墙靠上位置。
- 后院内部地面保持统一水泥材质。
- 如果继续丰富细节，优先添加小尺度生活物件，如水桶、农具、杂草、电动车、竹篮等，避免大面积遮挡房屋结构。

## 主要代码位置

- `src/core/primitives.js`：`box()`、`cylinder()`、`roundedPlane()`、`applyShadows()` 等通用建模基础工具。
- `src/core/textures.js`：`canvasTexture()`、`pixelTexture()`、`sharpenTexture()` 等纹理生成辅助。
- `src/core/random.js`：确定性随机数，用于保证程序化纹理和细节布局稳定。
- `src/homestead/index.js`：老家宅院一级元素聚合入口，负责把主屋、后厨、院墙、前后院和生活细节组装成一个 `Homestead`。
- `src/homestead/mainHouse.js`：主屋主体、门窗、屋顶。
- `src/homestead/rearAnnex.js`：背面右侧凸出厨房。
- `src/homestead/courtyardWall.js`：后院围墙与后院门。
- `src/homestead/rearYard.js`：后院统一水泥地面。
- `src/homestead/lifeDetails.js`：电动车、水桶、农具、晾衣绳、柴火垛、入户电线、杂草等生活元素。
- `src/homestead/yard.js`：前院地面、菜地、侧边小路、树木。
- `src/homestead/groundWear.js`：脚印、车辙、水洼、碎石等地面使用痕迹。
- `src/homestead/surfaceDetails.js`：墙面旧化、水痕、裂纹、锈迹等贴脸级细节。
- `createSmokeTrail()`：厨房烟囱上方的轻量炊烟动画。
- `createFirePit()`：后院柴火旁的小火堆和动态暖光。
- `createFusionVillageDistrict()`：老家左侧的村庄生活区、村道、广场、水井、村屋和诊所。
- `createModernFarmDistrict()`：老家西南侧的智慧农场、田垄、水渠、温室、谷仓和太阳能板。
- `createDistantVillage()`：远景程序化村落，用于增加空间纵深。
- `createSchoolDistrict()`：教育区，包含中小学、图书馆、宿舍、体育馆、操场和校园道路。
- `createIntegratedCityDistrict()`：CBD，包含 20-40 层高楼、地标塔、购物中心、商业街区、网格道路、广场和路灯。
- `createResidentialDistrict()`：现代住宅区，包含小高层组团、别墅区、老式多层住宅、中庭绿化和停车场。
- `createHistoricTourismDistrict()`：文旅古建区，包含古镇老街、牌坊、寺庙、宝塔、园林、小池和石拱桥。
- `createLeisureParkDistrict()`：休闲游乐区，包含大湖、摩天轮、旋转木马、过山车、公园步道和座椅。
- `createNaturalLandscapeBand()`：自然景观带，包含河流、湖泊、现代桥、古石拱桥、山丘和实例化树林。
- `createLivingWorldActors()`：村民、农夫、城市小车和无人机的路径动画。
- `createWorldRoadNetwork()`：连接老家、村庄、农场、学校和城市高楼区的主路系统。
- `createFineDetailLayer()`：不改主屋，专门给外围小城市叠加贴脸级小物件和铺装细节。
- `createAtmosphereVeils()`：远处半透明薄雾层，用于增加地平线空气感，避免遮挡主体。
- `addSceneLights()`：门厅、厨房、后院门的小范围暖光/点光。
- `createWorldGround()`：世界级大草地，和老家宅院主体分开。
- `createPlanOverlay()`：平面叠加线框。

## 服务脚本

项目现在只保留一个统一脚本：`start.sh`。

```bash
./start.sh start      # 启动，默认命令，也可直接 ./start.sh
./start.sh stop       # 停止
./start.sh restart    # 重启
./start.sh status     # 查看状态
```

也可以使用 npm 脚本：

```bash
npm start
npm run stop
npm run restart
npm run status
```

默认访问地址：`http://localhost:5173`。
