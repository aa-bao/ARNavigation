# 医院AR导航系统 API契约文档

> 版本: v1.0.0
> 最后更新: 2026-03-11

---

## 1. 接口规范

### 1.1 基础信息

| 项目 | 说明 |
|------|------|
| 协议 | HTTPS |
| 数据格式 | JSON |
| 编码 | UTF-8 |
| 时间格式 | ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) |
| 长度单位 | 米 (m) |
| 时间单位 | 分钟 (min) |

### 1.2 响应状态码

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 1.3 通用响应结构

```json
{
  "status": "success|error",
  "code": "200",
  "message": "操作成功",
  "data": {},
  "timestamp": "2026-03-11T10:30:00Z"
}
```

---

## 2. 导航规划接口

### 2.1 路径规划

**接口信息**

| 项目 | 值 |
|------|-----|
| URL | `/api/navigation/plan` |
| 方法 | POST |
| 描述 | 根据起点和终点计算最优导航路径 |

**请求头**

```http
Content-Type: application/json
Authorization: Bearer {access_token}
```

**请求体 (RequestBody)**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| startNodeId | string | 是 | 起点节点ID |
| endNodeId | string | 是 | 终点节点ID |
| preferElevator | boolean | 否 | 是否优先使用电梯，默认false |
| avoidStairs | boolean | 否 | 是否避免楼梯，默认false |

```json
{
  "startNodeId": "NODE_A_001",
  "endNodeId": "NODE_C_015",
  "preferElevator": true,
  "avoidStairs": false
}
```

**响应体 (Response)**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| status | string | 状态：success/error |
| pathNodes | array | 路径节点数组 |
| pathNodes[].nodeId | string | 节点ID |
| pathNodes[].nodeName | string | 节点名称 |
| pathNodes[].nodeType | string | 节点类型：room/corridor/elevator/stair/entrance |
| pathNodes[].floor | integer | 所在楼层 |
| pathNodes[].x | number | X坐标（用于AR定位） |
| pathNodes[].y | number | Y坐标（用于AR定位） |
| pathNodes[].z | number | Z坐标（用于AR定位） |
| distance | number | 总距离（米） |
| estimatedTime | number | 预计时间（分钟） |
| directions | array | 文字导航指令数组 |
| directions[].step | integer | 步骤序号 |
| directions[].instruction | string | 导航文字说明 |
| directions[].action | string | 动作类型：go_straight/turn_left/turn_right/turn_around/take_elevator/use_stairs/enter_room |
| directions[].nextNodeId | string | 下一个节点ID |
| directions[].distance | number | 该段距离（米） |

```json
{
  "status": "success",
  "code": "200",
  "message": "路径规划成功",
  "data": {
    "pathNodes": [
      {
        "nodeId": "NODE_A_001",
        "nodeName": "门诊大厅入口",
        "nodeType": "entrance",
        "floor": 1,
        "x": 120.5,
        "y": 80.2,
        "z": 0.0
      },
      {
        "nodeId": "NODE_A_015",
        "nodeName": "1号电梯厅",
        "nodeType": "elevator",
        "floor": 1,
        "x": 135.0,
        "y": 95.5,
        "z": 0.0
      },
      {
        "nodeId": "NODE_B_008",
        "nodeName": "3号电梯厅",
        "nodeType": "elevator",
        "floor": 3,
        "x": 135.0,
        "y": 95.5,
        "z": 6.0
      },
      {
        "nodeId": "NODE_C_015",
        "nodeName": "内科诊室3",
        "nodeType": "room",
        "floor": 3,
        "x": 150.2,
        "y": 110.8,
        "z": 6.0
      }
    ],
    "distance": 85.5,
    "estimatedTime": 3.5,
    "directions": [
      {
        "step": 1,
        "instruction": "从门诊大厅入口进入，向前走50米",
        "action": "go_straight",
        "nextNodeId": "NODE_A_015",
        "distance": 50.0
      },
      {
        "step": 2,
        "instruction": "在1号电梯厅乘坐电梯至3楼",
        "action": "take_elevator",
        "nextNodeId": "NODE_B_008",
        "distance": 0.0
      },
      {
        "step": 3,
        "instruction": "出电梯后向右转，直行25米",
        "action": "turn_right",
        "nextNodeId": "NODE_C_015",
        "distance": 25.0
      },
      {
        "step": 4,
        "instruction": "已到达目的地：内科诊室3",
        "action": "enter_room",
        "nextNodeId": "NODE_C_015",
        "distance": 10.5
      }
    ]
  },
  "timestamp": "2026-03-11T10:30:00Z"
}
```

**错误响应示例**

```json
{
  "status": "error",
  "code": "400",
  "message": "参数校验失败：endNodeId不能为空",
  "data": null,
  "timestamp": "2026-03-11T10:30:00Z"
}
```

---

## 3. 节点查询接口

### 3.1 根据二维码编码查询节点

**接口信息**

| 项目 | 值 |
|------|-----|
| URL | `/api/navigation/node/code/{nodeCode}` |
| 方法 | GET |
| 描述 | 通过扫描二维码获取的节点编码查询节点详细信息 |

**路径参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| nodeCode | string | 是 | 节点二维码编码（如：QR_A_001） |

**请求示例**

```http
GET /api/navigation/node/code/QR_A_001 HTTP/1.1
Authorization: Bearer {access_token}
```

**响应体 (Response)**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| nodeId | string | 节点ID |
| nodeCode | string | 节点二维码编码 |
| nodeName | string | 节点名称 |
| nodeType | string | 节点类型：room/corridor/elevator/stair/entrance/exit |
| floor | integer | 所在楼层 |
| building | string | 所属建筑 |
| department | string | 所属科室（如适用） |
| description | string | 节点描述 |
| coordinates | object | 坐标信息 |
| coordinates.x | number | X坐标 |
| coordinates.y | number | Y坐标 |
| coordinates.z | number | Z坐标（高度） |
| tags | array | 节点标签数组 |
| isAccessible | boolean | 是否无障碍节点 |
| images | array | 节点相关图片URL数组 |

```json
{
  "status": "success",
  "code": "200",
  "message": "查询成功",
  "data": {
    "nodeId": "NODE_A_001",
    "nodeCode": "QR_A_001",
    "nodeName": "门诊大厅入口",
    "nodeType": "entrance",
    "floor": 1,
    "building": "门诊楼A座",
    "department": null,
    "description": "医院主入口，设有导诊台",
    "coordinates": {
      "x": 120.5,
      "y": 80.2,
      "z": 0.0
    },
    "tags": ["入口", "导诊", "轮椅通道"],
    "isAccessible": true,
    "images": [
      "https://hospital.com/images/node_A_001_1.jpg",
      "https://hospital.com/images/node_A_001_2.jpg"
    ]
  },
  "timestamp": "2026-03-11T10:30:00Z"
}
```

### 3.2 获取相邻节点

**接口信息**

| 项目 | 值 |
|------|-----|
| URL | `/api/navigation/node/{nodeId}/neighbors` |
| 方法 | GET |
| 描述 | 获取指定节点的相邻可达节点列表 |

**路径参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| nodeId | string | 是 | 节点ID |

**查询参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| maxDistance | number | 否 | 最大距离限制（米），默认100 |
| includeStairs | boolean | 否 | 是否包含楼梯节点，默认true |
| includeElevator | boolean | 否 | 是否包含电梯节点，默认true |

**请求示例**

```http
GET /api/navigation/node/NODE_A_001/neighbors?maxDistance=50&includeStairs=false HTTP/1.1
Authorization: Bearer {access_token}
```

**响应体 (Response)**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| nodeId | string | 当前节点ID |
| totalNeighbors | integer | 相邻节点总数 |
| neighbors | array | 相邻节点数组 |
| neighbors[].nodeId | string | 相邻节点ID |
| neighbors[].nodeName | string | 相邻节点名称 |
| neighbors[].nodeType | string | 节点类型 |
| neighbors[].distance | number | 与当前节点的距离（米） |
| neighbors[].direction | string | 相对方向：front/back/left/right/up/down |
| neighbors[].floor | integer | 相邻节点所在楼层 |
| neighbors[].connectionType | string | 连接类型：walkway/stair/elevator/ramp |
| neighbors[].isAccessible | boolean | 是否无障碍通行 |

```json
{
  "status": "success",
  "code": "200",
  "message": "查询成功",
  "data": {
    "nodeId": "NODE_A_001",
    "totalNeighbors": 3,
    "neighbors": [
      {
        "nodeId": "NODE_A_002",
        "nodeName": "导诊台",
        "nodeType": "room",
        "distance": 15.5,
        "direction": "front",
        "floor": 1,
        "connectionType": "walkway",
        "isAccessible": true
      },
      {
        "nodeId": "NODE_A_015",
        "nodeName": "1号电梯厅",
        "nodeType": "elevator",
        "distance": 35.0,
        "direction": "right",
        "floor": 1,
        "connectionType": "walkway",
        "isAccessible": true
      },
      {
        "nodeId": "NODE_A_003",
        "nodeName": "楼梯间A",
        "nodeType": "stair",
        "distance": 25.0,
        "direction": "left",
        "floor": 1,
        "connectionType": "stair",
        "isAccessible": false
      }
    ]
  },
  "timestamp": "2026-03-11T10:30:00Z"
}
```

---

## 4. 错误码定义

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400001 | 参数校验失败 | 检查请求参数格式和必填项 |
| 400002 | 节点不存在 | 确认节点ID或编码是否正确 |
| 400003 | 路径不可达 | 检查起点和终点是否在同一建筑 |
| 400004 | 缺少必要参数 | 补充缺失的请求参数 |
| 401001 | Token已过期 | 重新获取访问令牌 |
| 401002 | Token无效 | 检查Token格式和签名 |
| 404001 | 资源不存在 | 确认请求URL是否正确 |
| 500001 | 服务器内部错误 | 联系系统管理员 |
| 500002 | 数据库查询失败 | 稍后重试或联系管理员 |

---

## 5. 附录

### 5.1 节点类型枚举

| 类型值 | 说明 |
|--------|------|
| room | 房间（诊室、病房等） |
| corridor | 走廊通道 |
| elevator | 电梯厅 |
| stair | 楼梯间 |
| entrance | 入口 |
| exit | 出口 |
| restroom | 卫生间 |
| reception | 导诊台/服务台 |

### 5.2 导航动作类型枚举

| 动作值 | 说明 |
|--------|------|
| go_straight | 直行 |
| turn_left | 左转 |
| turn_right | 右转 |
| turn_around | 掉头 |
| take_elevator | 乘坐电梯 |
| use_stairs | 走楼梯 |
| enter_room | 进入房间 |

### 5.3 连接类型枚举

| 类型值 | 说明 |
|--------|------|
| walkway | 步行通道 |
| stair | 楼梯 |
| elevator | 电梯 |
| ramp | 坡道 |
| escalator | 扶梯 |
