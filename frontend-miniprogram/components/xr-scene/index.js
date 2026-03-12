// XR场景组件
Component({
  properties: {
    // 场景背景色
    clearColor: {
      type: String,
      value: '0 0 0 0'
    },
    // 是否启用阴影
    shadows: {
      type: Boolean,
      value: true
    },
    // 环境贴图
    envMap: {
      type: String,
      value: ''
    }
  },

  data: {
    isReady: false,
    scene: null,
    children: []
  },

  lifetimes: {
    attached() {
      console.log('[XR-Scene] 组件挂载');
    },

    ready() {
      console.log('[XR-Scene] 组件就绪');
      this.initScene();
    },

    detached() {
      console.log('[XR-Scene] 组件卸载');
      this.destroyScene();
    }
  },

  methods: {
    // 初始化场景
    initScene() {
      const xrSystem = wx.getXrSystem ? wx.getXrSystem() : null;
      if (!xrSystem) {
        console.error('[XR-Scene] XR系统不可用');
        return;
      }

      // 创建场景
      const scene = xrSystem.createScene();
      this.setData({ scene });

      // 设置场景参数
      this.updateSceneParams();

      // 场景就绪
      this.setData({ isReady: true });
      this.triggerEvent('ready', { scene });

      console.log('[XR-Scene] 场景初始化完成');
    },

    // 更新场景参数
    updateSceneParams() {
      const { scene, clearColor, shadows } = this.data;
      if (!scene) return;

      // 设置背景色
      const colorParts = clearColor.split(' ').map(Number);
      if (colorParts.length >= 4) {
        scene.background = {
          r: colorParts[0],
          g: colorParts[1],
          b: colorParts[2],
          a: colorParts[3]
        };
      }

      // 设置阴影
      scene.shadowsEnabled = shadows;
    },

    // 添加子元素
    addChild(child) {
      const { children } = this.data;
      children.push(child);
      this.setData({ children });

      // 如果场景已就绪，通知子元素
      if (this.data.isReady && child.onParentReady) {
        child.onParentReady(this.data.scene);
      }
    },

    // 移除子元素
    removeChild(child) {
      const { children } = this.data;
      const index = children.indexOf(child);
      if (index > -1) {
        children.splice(index, 1);
        this.setData({ children });
      }
    },

    // 获取场景
    getScene() {
      return this.data.scene;
    },

    // 销毁场景
    destroyScene() {
      const { scene } = this.data;
      if (scene) {
        scene.destroy();
        this.setData({
          scene: null,
          isReady: false,
          children: []
        });
      }
    }
  },

  observers: {
    'clearColor, shadows': function() {
      this.updateSceneParams();
    }
  }
});
