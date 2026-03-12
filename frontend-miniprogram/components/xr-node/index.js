// XR节点组件 - 3D对象的容器
Component({
  properties: {
    // 节点位置
    position: {
      type: String,
      value: '0 0 0'
    },
    // 节点旋转 (欧拉角)
    rotation: {
      type: String,
      value: '0 0 0'
    },
    // 节点缩放
    scale: {
      type: String,
      value: '1 1 1'
    },
    // 是否可见
    visible: {
      type: Boolean,
      value: true
    },
    // 节点ID
    nodeId: {
      type: String,
      value: ''
    }
  },

  data: {
    node: null,
    scene: null,
    children: [],
    isReady: false
  },

  lifetimes: {
    attached() {
      console.log('[XR-Node] 组件挂载');
    },

    ready() {
      console.log('[XR-Node] 组件就绪');
      this.initNode();
    },

    detached() {
      console.log('[XR-Node] 组件卸载');
      this.destroyNode();
    }
  },

  methods: {
    // 初始化节点
    initNode() {
      // 获取父级场景
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];

      if (!currentPage || !currentPage.scene) {
        console.warn('[XR-Node] 场景未就绪，延迟初始化');
        setTimeout(() => this.initNode(), 100);
        return;
      }

      const scene = currentPage.scene;
      this.setData({ scene });

      // 创建变换节点
      const xrSystem = wx.getXrSystem ? wx.getXrSystem() : null;
      if (!xrSystem) {
        console.error('[XR-Node] XR系统不可用');
        return;
      }

      // 创建节点
      const node = xrSystem.createNode();

      // 应用变换
      this.updateNodeTransform(node);

      // 添加到场景
      scene.addNode(node);

      this.setData({
        node,
        isReady: true
      });

      // 通知父级节点
      this.triggerEvent('ready', { node });

      console.log('[XR-Node] 节点初始化完成');
    },

    // 更新节点变换
    updateNodeTransform(node) {
      if (!node) return;

      const { position, rotation, scale, visible } = this.properties;

      // 解析位置
      const posParts = position.split(' ').map(Number);
      node.position = { x: posParts[0], y: posParts[1], z: posParts[2] };

      // 解析旋转（欧拉角转四元数）
      const rotParts = rotation.split(' ').map(Number);
      node.rotation = this.eulerToQuaternion(rotParts[0], rotParts[1], rotParts[2]);

      // 解析缩放
      const scaleParts = scale.split(' ').map(Number);
      node.scale = { x: scaleParts[0], y: scaleParts[1], z: scaleParts[2] };

      // 可见性
      node.visible = visible;
    },

    // 欧拉角转四元数
    eulerToQuaternion(x, y, z) {
      const toRad = Math.PI / 180;
      const cx = Math.cos(x * toRad / 2);
      const sx = Math.sin(x * toRad / 2);
      const cy = Math.cos(y * toRad / 2);
      const sy = Math.sin(y * toRad / 2);
      const cz = Math.cos(z * toRad / 2);
      const sz = Math.sin(z * toRad / 2);

      return {
        x: sx * cy * cz - cx * sy * sz,
        y: cx * sy * cz + sx * cy * sz,
        z: cx * cy * sz - sx * sy * cz,
        w: cx * cy * cz + sx * sy * sz
      };
    },

    // 销毁节点
    destroyNode() {
      const { node, scene } = this.data;
      if (node && scene) {
        scene.removeNode(node);
        node.destroy();
      }
      this.setData({ node: null, scene: null, isReady: false });
    },

    // 获取节点
    getNode() {
      return this.data.node;
    },

    // 添加子节点
    addChild(childNode) {
      const { node } = this.data;
      if (node && childNode) {
        node.addChild(childNode);
      }
    },

    // 移除子节点
    removeChild(childNode) {
      const { node } = this.data;
      if (node && childNode) {
        node.removeChild(childNode);
      }
    }
  },

  observers: {
    'position, rotation, scale, visible': function() {
      const { node } = this.data;
      if (node) {
        this.updateNodeTransform(node);
      }
    }
  }
});
