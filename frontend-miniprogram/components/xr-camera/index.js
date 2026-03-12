// XR相机组件
Component({
  properties: {
    // 相机位置
    position: {
      type: String,
      value: '0 0 5'
    },
    // 相机旋转
    rotation: {
      type: String,
      value: '0 0 0'
    },
    // 视场角
    fov: {
      type: Number,
      value: 60
    },
    // 近裁剪面
    near: {
      type: Number,
      value: 0.1
    },
    // 远裁剪面
    far: {
      type: Number,
      value: 1000
    },
    // 是否AR相机
    isARCamera: {
      type: Boolean,
      value: false
    },
    // 背景类型 (ar/color)
    background: {
      type: String,
      value: 'color'
    },
    // 清屏颜色
    clearColor: {
      type: String,
      value: '0 0 0 1'
    }
  },

  data: {
    camera: null,
    scene: null
  },

  lifetimes: {
    attached() {
      console.log('[XR-Camera] 组件挂载');
    },

    ready() {
      console.log('[XR-Camera] 组件就绪');
      this.initCamera();
    },

    detached() {
      console.log('[XR-Camera] 组件卸载');
      this.destroyCamera();
    }
  },

  methods: {
    // 初始化相机
    initCamera() {
      // 获取父级场景
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];

      if (!currentPage || !currentPage.scene) {
        console.warn('[XR-Camera] 场景未就绪，延迟初始化');
        setTimeout(() => this.initCamera(), 100);
        return;
      }

      const scene = currentPage.scene;
      this.setData({ scene });

      // 创建相机
      const xrSystem = wx.getXrSystem ? wx.getXrSystem() : null;
      if (!xrSystem) {
        console.error('[XR-Camera] XR系统不可用');
        return;
      }

      const camera = xrSystem.createCamera();

      // 设置相机参数
      this.updateCameraParams(camera);

      // 设置相机到场景
      scene.setCamera(camera);

      this.setData({ camera });
      console.log('[XR-Camera] 相机初始化完成');
    },

    // 更新相机参数
    updateCameraParams(camera) {
      const {
        position, rotation, fov, near, far,
        isARCamera, background, clearColor
      } = this.properties;

      // 解析位置和旋转
      const posParts = position.split(' ').map(Number);
      const rotParts = rotation.split(' ').map(Number);

      // 设置相机属性
      camera.position = { x: posParts[0], y: posParts[1], z: posParts[2] };
      camera.rotation = { x: rotParts[0], y: rotParts[1], z: rotParts[2] };
      camera.fov = fov;
      camera.near = near;
      camera.far = far;
      camera.isAR = isARCamera;
      camera.background = background;

      // 解析清屏颜色
      const colorParts = clearColor.split(' ').map(Number);
      camera.clearColor = {
        r: colorParts[0],
        g: colorParts[1],
        b: colorParts[2],
        a: colorParts[3]
      };
    },

    // 销毁相机
    destroyCamera() {
      const { camera, scene } = this.data;
      if (camera && scene) {
        scene.removeCamera(camera);
      }
      this.setData({ camera: null, scene: null });
    },

    // 更新相机变换
    updateTransform() {
      const { camera } = this.data;
      if (camera) {
        this.updateCameraParams(camera);
      }
    }
  },

  observers: {
    'position, rotation, fov, near, far, isARCamera, background, clearColor': function() {
      this.updateTransform();
    }
  }
});
