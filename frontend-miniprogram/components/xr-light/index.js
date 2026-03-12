// XR光源组件
Component({
  properties: {
    // 光源类型: ambient, directional, point, spot
    type: {
      type: String,
      value: 'ambient'
    },
    // 光源颜色 (RGB)
    color: {
      type: String,
      value: '1 1 1'
    },
    // 光源强度
    intensity: {
      type: Number,
      value: 1.0
    },
    // 光源位置 (point/spot类型使用)
    position: {
      type: String,
      value: '0 10 0'
    },
    // 光源方向 (directional/spot类型使用)
    direction: {
      type: String,
      value: '0 -1 0'
    },
    // 点光源衰减范围
    range: {
      type: Number,
      value: 10
    },
    // 聚光灯角度
    angle: {
      type: Number,
      value: 45
    },
    // 聚光灯衰减
    penumbra: {
      type: Number,
      value: 0.5
    }
  },

  data: {
    light: null,
    scene: null
  },

  lifetimes: {
    attached() {
      console.log('[XR-Light] 组件挂载');
    },

    ready() {
      console.log('[XR-Light] 组件就绪');
      this.initLight();
    },

    detached() {
      console.log('[XR-Light] 组件卸载');
      this.destroyLight();
    }
  },

  methods: {
    // 初始化光源
    initLight() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];

      if (!currentPage || !currentPage.scene) {
        console.warn('[XR-Light] 场景未就绪，延迟初始化');
        setTimeout(() => this.initLight(), 100);
        return;
      }

      const scene = currentPage.scene;
      this.setData({ scene });

      // 创建光源
      const xrSystem = wx.getXrSystem ? wx.getXrSystem() : null;
      if (!xrSystem) {
        console.error('[XR-Light] XR系统不可用');
        return;
      }

      const { type, color, intensity } = this.properties;

      // 解析颜色
      const colorParts = color.split(' ').map(Number);

      // 根据类型创建光源
      let light;
      switch (type) {
        case 'ambient':
          light = xrSystem.createAmbientLight({
            color: { r: colorParts[0], g: colorParts[1], b: colorParts[2] },
            intensity
          });
          break;

        case 'directional':
          const dirParts = this.properties.direction.split(' ').map(Number);
          light = xrSystem.createDirectionalLight({
            color: { r: colorParts[0], g: colorParts[1], b: colorParts[2] },
            intensity,
            direction: { x: dirParts[0], y: dirParts[1], z: dirParts[2] }
          });
          break;

        case 'point':
          const posParts = this.properties.position.split(' ').map(Number);
          light = xrSystem.createPointLight({
            color: { r: colorParts[0], g: colorParts[1], b: colorParts[2] },
            intensity,
            position: { x: posParts[0], y: posParts[1], z: posParts[2] },
            range: this.properties.range
          });
          break;

        case 'spot':
          const spotPosParts = this.properties.position.split(' ').map(Number);
          const spotDirParts = this.properties.direction.split(' ').map(Number);
          light = xrSystem.createSpotLight({
            color: { r: colorParts[0], g: colorParts[1], b: colorParts[2] },
            intensity,
            position: { x: spotPosParts[0], y: spotPosParts[1], z: spotPosParts[2] },
            direction: { x: spotDirParts[0], y: spotDirParts[1], z: spotDirParts[2] },
            angle: this.properties.angle,
            penumbra: this.properties.penumbra
          });
          break;

        default:
          console.error('[XR-Light] 未知的光源类型:', type);
          return;
      }

      // 添加光源到场景
      scene.addLight(light);
      this.setData({ light });

      console.log('[XR-Light] 光源初始化完成:', type);
    },

    // 销毁光源
    destroyLight() {
      const { light, scene } = this.data;
      if (light && scene) {
        scene.removeLight(light);
        this.setData({ light: null, scene: null });
      }
    },

    // 更新光源
    updateLight() {
      const { light } = this.data;
      if (!light) return;

      // 更新光源属性
      const { color, intensity } = this.properties;
      const colorParts = color.split(' ').map(Number);

      light.color = { r: colorParts[0], g: colorParts[1], b: colorParts[2] };
      light.intensity = intensity;
    }
  },

  observers: {
    'color, intensity': function() {
      this.updateLight();
    }
  }
});
