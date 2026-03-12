// XR GLTF模型组件
Component({
  properties: {
    // 模型URL (GLB/GLTF格式)
    model: {
      type: String,
      value: ''
    },
    // 是否自动播放动画
    autoPlay: {
      type: Boolean,
      value: true
    },
    // 动画名称
    animation: {
      type: String,
      value: ''
    },
    // 是否循环播放
    loop: {
      type: Boolean,
      value: true
    },
    // 播放速度
    speed: {
      type: Number,
      value: 1.0
    },
    // 缩放
    scale: {
      type: String,
      value: '1 1 1'
    },
    // 位置偏移
    position: {
      type: String,
      value: '0 0 0'
    },
    // 旋转
    rotation: {
      type: String,
      value: '0 0 0'
    }
  },

  data: {
    modelObject: null,
    scene: null,
    mixer: null,
    isLoaded: false
  },

  lifetimes: {
    attached() {
      console.log('[XR-GLTF] 组件挂载');
    },

    ready() {
      console.log('[XR-GLTF] 组件就绪');
      if (this.properties.model) {
        this.loadModel();
      }
    },

    detached() {
      console.log('[XR-GLTF] 组件卸载');
      this.destroyModel();
    }
  },

  methods: {
    // 加载模型
    loadModel() {
      const { model } = this.properties;
      if (!model) {
        console.warn('[XR-GLTF] 模型URL为空');
        return;
      }

      console.log('[XR-GLTF] 加载模型:', model);

      // 获取场景
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];

      if (!currentPage || !currentPage.scene) {
        console.warn('[XR-GLTF] 场景未就绪，延迟加载');
        setTimeout(() => this.loadModel(), 100);
        return;
      }

      const scene = currentPage.scene;
      this.setData({ scene });

      // 创建GLTF加载器
      const xrSystem = wx.getXrSystem ? wx.getXrSystem() : null;
      if (!xrSystem) {
        console.error('[XR-GLTF] XR系统不可用');
        return;
      }

      // 加载GLB模型
      const loader = xrSystem.createGLTFLoader();

      loader.load({
        url: model,
        success: (gltf) => {
          console.log('[XR-GLTF] 模型加载成功:', gltf);

          const modelObject = gltf.scene;

          // 应用变换
          this.applyTransform(modelObject);

          // 添加到场景
          scene.add(modelObject);

          this.setData({
            modelObject,
            isLoaded: true
          });

          // 处理动画
          if (gltf.animations && gltf.animations.length > 0) {
            this.setupAnimations(gltf.animations);
          }

          // 触发加载完成事件
          this.triggerEvent('load', { gltf, model: modelObject });
        },
        fail: (error) => {
          console.error('[XR-GLTF] 模型加载失败:', error);
          this.triggerEvent('error', { error });

          // 使用备用模型或创建默认几何体
          this.createFallbackModel();
        }
      });
    },

    // 应用变换
    applyTransform(object) {
      const { position, rotation, scale } = this.properties;

      // 解析位置
      const posParts = position.split(' ').map(Number);
      object.position.set(posParts[0], posParts[1], posParts[2]);

      // 解析旋转
      const rotParts = rotation.split(' ').map(Number);
      object.rotation.set(
        rotParts[0] * Math.PI / 180,
        rotParts[1] * Math.PI / 180,
        rotParts[2] * Math.PI / 180
      );

      // 解析缩放
      const scaleParts = scale.split(' ').map(Number);
      object.scale.set(scaleParts[0], scaleParts[1], scaleParts[2]);
    },

    // 设置动画
    setupAnimations(animations) {
      const xrSystem = wx.getXrSystem ? wx.getXrSystem() : null;
      if (!xrSystem) return;

      // 创建动画混合器
      const mixer = xrSystem.createAnimationMixer(this.data.modelObject);
      this.setData({ mixer });

      // 获取动画剪辑
      const { animation, autoPlay, loop, speed } = this.properties;

      let clip;
      if (animation) {
        // 查找指定名称的动画
        clip = animations.find(a => a.name === animation);
      }
      if (!clip) {
        // 使用第一个动画
        clip = animations[0];
      }

      if (clip) {
        const action = mixer.clipAction(clip);
        action.loop = loop ? 'loop' : 'once';
        action.speed = speed;

        if (autoPlay) {
          action.play();
        }
      }

      // 在渲染循环中更新动画
      this.startAnimationLoop();
    },

    // 开始动画循环
    startAnimationLoop() {
      const updateAnimation = () => {
        if (!this.data.mixer) return;

        // 更新动画混合器 (假设60fps)
        this.data.mixer.update(1/60);

        requestAnimationFrame(updateAnimation);
      };

      updateAnimation();
    },

    // 播放动画
    playAnimation(name) {
      if (!this.data.mixer) return;

      const action = this.data.mixer.clipAction(name);
      if (action) {
        action.play();
      }
    },

    // 停止动画
    stopAnimation(name) {
      if (!this.data.mixer) return;

      const action = this.data.mixer.clipAction(name);
      if (action) {
        action.stop();
      }
    },

    // 创建备用模型（当GLB加载失败时）
    createFallbackModel() {
      console.log('[XR-GLTF] 创建备用几何体');

      const xrSystem = wx.getXrSystem ? wx.getXrSystem() : null;
      if (!xrSystem) return;

      // 创建一个简单的箭头形状
      const geometry = xrSystem.createConeGeometry({
        radius: 0.3,
        height: 1,
        radialSegments: 8
      });

      const material = xrSystem.createMaterial({
        color: { r: 0, g: 0.7, b: 1 }
      });

      const mesh = xrSystem.createMesh(geometry, material);

      // 应用变换
      this.applyTransform(mesh);

      // 添加到场景
      const { scene } = this.data;
      if (scene) {
        scene.add(mesh);
      }

      this.setData({
        modelObject: mesh,
        isLoaded: true
      });

      this.triggerEvent('load', { fallback: true, model: mesh });
    },

    // 销毁模型
    destroyModel() {
      const { modelObject, scene, mixer } = this.data;

      // 停止动画
      if (mixer) {
        mixer.stopAllAction();
      }

      // 从场景中移除
      if (modelObject && scene) {
        scene.remove(modelObject);
      }

      this.setData({
        modelObject: null,
        mixer: null,
        isLoaded: false
      });
    }
  }
});
