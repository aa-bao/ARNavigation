// XR页面容器组件
Component({
  options: {
    multipleSlots: true
  },

  properties: {
    // 画布尺寸
    width: {
      type: String,
      value: '100vw'
    },
    height: {
      type: String,
      value: '100vh'
    },
    // 是否AR模式
    isARMode: {
      type: Boolean,
      value: false
    },
    // 是否自动启动
    autoStart: {
      type: Boolean,
      value: true
    }
  },

  data: {
    canvasId: 'xr-canvas',
    xrSystem: null,
    scene: null,
    renderer: null,
    camera: null,
    isReady: false
  },

  lifetimes: {
    attached() {
      console.log('[XR-Page] 组件挂载');
      this.data.canvasId = `xr-canvas-${Date.now()}`;
      this.setData({ canvasId: this.data.canvasId });
    },

    ready() {
      console.log('[XR-Page] 组件就绪');
      if (this.properties.autoStart) {
        this.initXR();
      }
    },

    detached() {
      console.log('[XR-Page] 组件卸载');
      this.destroyXR();
    }
  },

  methods: {
    // 初始化XR系统
    async initXR() {
      try {
        console.log('[XR-Page] 初始化XR系统');

        // 检查XR支持
        const xrSystem = wx.getXrSystem ? wx.getXrSystem() : null;
        if (!xrSystem) {
          throw new Error('当前环境不支持XR-FRAME');
        }

        this.setData({ xrSystem });

        // 初始化WebGL
        const query = wx.createSelectorQuery().in(this);
        query.select(`#${this.data.canvasId}`)
          .node()
          .exec((res) => {
            const canvas = res[0].node;
            this.initWebGL(canvas, xrSystem);
          });

      } catch (error) {
        console.error('[XR-Page] XR初始化失败:', error);
        this.triggerEvent('error', { type: 'init_failed', message: error.message });
      }
    },

    // 初始化WebGL
    initWebGL(canvas, xrSystem) {
      try {
        const gl = canvas.getContext('webgl2', {
          antialias: true,
          alpha: true
        });

        if (!gl) {
          throw new Error('WebGL2不支持');
        }

        // 创建渲染器
        const renderer = xrSystem.createRenderer(gl);
        this.setData({ renderer });

        // 创建场景
        const scene = xrSystem.createScene();
        this.setData({ scene });

        // 设置就绪状态
        this.setData({ isReady: true });

        // 触发就绪事件
        this.triggerEvent('ready', { scene, renderer });

        // 如果是AR模式，启动AR
        if (this.properties.isARMode) {
          this.startAR(renderer);
        }

        // 开始渲染循环
        this.startRenderLoop();

      } catch (error) {
        console.error('[XR-Page] WebGL初始化失败:', error);
        this.triggerEvent('error', { type: 'webgl_failed', message: error.message });
      }
    },

    // 启动AR模式
    async startAR(renderer) {
      try {
        console.log('[XR-Page] 启动AR模式');

        // 创建AR会话
        const session = await renderer.xr.requestSession('immersive-ar', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['hit-test']
        });

        this.setData({ arSession: session });

        // 触发AR就绪事件
        this.triggerEvent('arReady', { session });

      } catch (error) {
        console.error('[XR-Page] AR启动失败:', error);
        this.triggerEvent('error', { type: 'ar_failed', message: error.message });
      }
    },

    // 开始渲染循环
    startRenderLoop() {
      const render = () => {
        if (!this.data.isReady) return;

        const { scene, renderer, camera } = this.data;
        if (scene && renderer) {
          renderer.render(scene, camera);
        }

        this.renderFrameId = requestAnimationFrame(render);
      };

      render();
    },

    // 停止渲染
    stopRenderLoop() {
      if (this.renderFrameId) {
        cancelAnimationFrame(this.renderFrameId);
        this.renderFrameId = null;
      }
    },

    // 销毁XR
    destroyXR() {
      console.log('[XR-Page] 销毁XR');
      this.stopRenderLoop();

      const { arSession, renderer } = this.data;

      if (arSession) {
        arSession.end();
      }

      if (renderer) {
        renderer.dispose();
      }

      this.setData({
        isReady: false,
        xrSystem: null,
        scene: null,
        renderer: null,
        camera: null,
        arSession: null
      });
    },

    // 触摸事件处理
    onTouchStart(e) {
      this.triggerEvent('touchstart', e);
    },

    onTouchMove(e) {
      this.triggerEvent('touchmove', e);
    },

    onTouchEnd(e) {
      this.triggerEvent('touchend', e);
    }
  }
});
