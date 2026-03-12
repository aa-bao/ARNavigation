# 3D模型说明

## 当前模型

- `arrow.glb`: 示例3D模型（来自Khronos glTF示例），可替换为您自己的箭头模型

## 如何添加自己的箭头模型

1. 下载或创建一个箭头的GLB/GLTF格式3D模型
2. 将模型文件命名为 `arrow.glb`
3. 替换此目录下的文件

## 推荐的免费3D模型资源

- Sketchfab (https://sketchfab.com/) - 搜索"arrow"并筛选GLTF/GLB格式
- Khronos glTF示例 (https://github.com/KhronosGroup/glTF-Sample-Models)
- Free3D (https://free3d.com/)

## 模型要求

1. 格式：GLB或GLTF
2. 建议尺寸：箭头朝上，模型大小适中
3. 材质建议：使用金属/粗糙材质以获得更好的效果

## 注意事项

微信小程序的xr-scene组件需要注意：

- 模型文件大小建议在5MB以内
- 使用简单的材质，避免复杂的PBR材质
- 注意纹理贴图的使用，避免过大的纹理文件
