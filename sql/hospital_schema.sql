-- 医院AR实景导航系统数据库表结构
-- 创建时间: 2026
-- 数据库: hospital_ar_db
-- 字符集: utf8mb4

-- =====================================================
-- 1. 创建数据库 (如不存在)
-- =====================================================
CREATE DATABASE IF NOT EXISTS hospital_ar_db
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE hospital_ar_db;

-- =====================================================
-- 2. 医院节点表 (包含坐标和二维码信息)
-- =====================================================
DROP TABLE IF EXISTS hospital_edges;
DROP TABLE IF EXISTS hospital_nodes;

CREATE TABLE IF NOT EXISTS hospital_nodes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '节点ID',
    node_code VARCHAR(64) NOT NULL COMMENT '节点唯一编码(用于二维码)',
    node_name VARCHAR(128) NOT NULL COMMENT '节点名称',
    floor INT NOT NULL COMMENT '楼层',
    x_coordinate DECIMAL(10, 4) NOT NULL COMMENT 'X坐标(米)',
    y_coordinate DECIMAL(10, 4) NOT NULL COMMENT 'Y坐标(米)',
    node_type VARCHAR(32) DEFAULT 'NORMAL' COMMENT '节点类型: NORMAL-普通, ENTRANCE-入口, EXIT-出口, ROOM-房间, ELEVATOR-电梯, STAIRS-楼梯, RESTROOM-洗手间',
    description VARCHAR(512) COMMENT '节点描述',
    qr_code_url VARCHAR(256) COMMENT '二维码图片URL',
    is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用: 0-禁用, 1-启用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_node_code (node_code),
    INDEX idx_floor (floor),
    INDEX idx_node_type (node_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='医院节点表';

-- =====================================================
-- 3. 医院边表 (邻接表，表示节点之间的连接)
-- =====================================================
CREATE TABLE IF NOT EXISTS hospital_edges (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '边ID',
    from_node_id BIGINT NOT NULL COMMENT '起始节点ID',
    to_node_id BIGINT NOT NULL COMMENT '目标节点ID',
    distance DECIMAL(10, 4) NOT NULL COMMENT '距离(米)',
    is_accessible TINYINT(1) DEFAULT 1 COMMENT '是否可达: 0-不可达, 1-可达',
    is_stairs TINYINT(1) DEFAULT 0 COMMENT '是否为楼梯: 0-否, 1-是',
    is_elevator TINYINT(1) DEFAULT 0 COMMENT '是否为电梯: 0-否, 1-是',
    direction_angle DECIMAL(6, 2) COMMENT '方向角(度)，0表示正东，90表示正北',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_from_node (from_node_id),
    INDEX idx_to_node (to_node_id),
    INDEX idx_accessible (is_accessible),
    UNIQUE KEY uk_from_to (from_node_id, to_node_id),
    FOREIGN KEY (from_node_id) REFERENCES hospital_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (to_node_id) REFERENCES hospital_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='医院边表';

-- =====================================================
-- 4. 示例数据 - 插入节点
-- =====================================================
INSERT INTO hospital_nodes (node_code, node_name, floor, x_coordinate, y_coordinate, node_type, description) VALUES
('NODE-001', '医院正门入口', 1, 0.0000, 0.0000, 'ENTRANCE', '医院一楼正门入口'),
('NODE-002', '一楼大厅', 1, 5.0000, 0.0000, 'NORMAL', '一楼大厅服务台附近'),
('NODE-003', '一号电梯', 1, 10.0000, 0.0000, 'ELEVATOR', '通往各楼层的一号电梯'),
('NODE-004', '内科诊室', 1, 5.0000, 5.0000, 'ROOM', '101内科诊室'),
('NODE-005', '洗手间', 1, 8.0000, 3.0000, 'RESTROOM', '一楼洗手间'),
('NODE-006', '二楼电梯口', 2, 10.0000, 0.0000, 'ELEVATOR', '二楼电梯出口'),
('NODE-007', '外科诊室', 2, 5.0000, 5.0000, 'ROOM', '201外科诊室'),
('NODE-008', '药房', 1, 12.0000, 2.0000, 'ROOM', '一楼药房');

-- =====================================================
-- 5. 示例数据 - 插入边(无向图，需要双向插入)
-- =====================================================
-- 注意：先插入节点，再插入边，避免外键约束错误
INSERT INTO hospital_edges (from_node_id, to_node_id, distance, direction_angle, is_elevator, is_stairs) VALUES
(1, 2, 5.0000, 0.00, 0, 0),
(2, 1, 5.0000, 180.00, 0, 0),
(2, 3, 5.0000, 0.00, 0, 0),
(3, 2, 5.0000, 180.00, 0, 0),
(2, 4, 5.0000, 90.00, 0, 0),
(4, 2, 5.0000, 270.00, 0, 0),
(2, 5, 4.2426, 45.00, 0, 0),
(5, 2, 4.2426, 225.00, 0, 0),
-- 电梯连接（3号是一楼电梯，6号是二楼电梯口，距离为0表示同一电梯）
(3, 6, 0.0000, NULL, 1, 0),
(6, 3, 0.0000, NULL, 1, 0),
(6, 7, 7.0711, 135.00, 0, 0),
(7, 6, 7.0711, 315.00, 0, 0),
(3, 8, 2.8284, 45.00, 0, 0),
(8, 3, 2.8284, 225.00, 0, 0);

-- =====================================================
-- 6. 验证数据完整性
-- =====================================================
-- 查询节点总数
SELECT '节点总数' as 统计项, COUNT(*) as 数量 FROM hospital_nodes WHERE is_active = 1
UNION ALL
SELECT '边总数', COUNT(*) FROM hospital_edges WHERE is_accessible = 1;
