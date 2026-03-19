export const MAP_COORDINATE_RANGE = Object.freeze({
  minX: -8,
  maxX: 48,
  minY: -20,
  maxY: 35
});

export const MAP_VIEW_TYPES = Object.freeze({
  FLOOR: 'floor',
  OVERVIEW: 'overview'
});

export const MAP_FLOOR_OPTIONS = Object.freeze([
  {
    key: '1F',
    floor: 1,
    type: MAP_VIEW_TYPES.FLOOR,
    title: '1F 平面图',
    imagePath: '/assets/maps/Hospital_Layout_Floor_1.png',
    plotArea: Object.freeze({
      left: 0.16,
      right: 0.815,
      top: 0.165,
      bottom: 0.835
    })
  },
  {
    key: '2F',
    floor: 2,
    type: MAP_VIEW_TYPES.FLOOR,
    title: '2F 平面图',
    imagePath: '/assets/maps/Hospital_Layout_Floor_2.png',
    plotArea: Object.freeze({
      left: 0.16,
      right: 0.815,
      top: 0.165,
      bottom: 0.835
    })
  },
  {
    key: '3F',
    floor: 3,
    type: MAP_VIEW_TYPES.FLOOR,
    title: '3F 平面图',
    imagePath: '/assets/maps/Hospital_Layout_Floor_3.png',
    plotArea: Object.freeze({
      left: 0.16,
      right: 0.815,
      top: 0.165,
      bottom: 0.835
    })
  },
  {
    key: '3D',
    floor: null,
    type: MAP_VIEW_TYPES.OVERVIEW,
    title: '3D 总览',
    imagePath: '/assets/maps/hospital_3d_layout.png'
  }
]);

export const getMapOptionByKey = (key) =>
  MAP_FLOOR_OPTIONS.find((item) => item.key === key) || null;

export const getFloorMapConfig = (floor) =>
  MAP_FLOOR_OPTIONS.find((item) => item.type === MAP_VIEW_TYPES.FLOOR && item.floor === Number(floor)) || null;
