-- 统一用户中心初始化脚本
-- 说明：包含统一用户表、会话表、默认管理员账号和常用索引

CREATE TABLE IF NOT EXISTS app_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键 ID',
  username VARCHAR(64) NOT NULL COMMENT '登录账号，管理员和微信用户统一使用',
  password_hash CHAR(64) DEFAULT NULL COMMENT '密码哈希，管理员账号使用 SHA-256 十六进制',
  nickname VARCHAR(64) NOT NULL COMMENT '用户昵称或显示名',
  avatar_url VARCHAR(255) DEFAULT NULL COMMENT '头像地址',
  phone VARCHAR(32) DEFAULT NULL COMMENT '手机号',
  openid VARCHAR(128) DEFAULT NULL COMMENT '微信 openid',
  unionid VARCHAR(128) DEFAULT NULL COMMENT '微信 unionid',
  user_type VARCHAR(32) NOT NULL COMMENT '用户类型：ADMIN 或 WECHAT',
  status VARCHAR(32) NOT NULL DEFAULT 'ENABLED' COMMENT '状态：ENABLED 或 DISABLED',
  last_login_at DATETIME DEFAULT NULL COMMENT '最近登录时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0 未删除，1 已删除',
  UNIQUE KEY uk_app_user_username (username),
  UNIQUE KEY uk_app_user_openid (openid),
  KEY idx_app_user_type_status (user_type, status),
  KEY idx_app_user_deleted_created (deleted, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统一用户表';

CREATE TABLE IF NOT EXISTS user_session (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键 ID',
  user_id BIGINT NOT NULL COMMENT '关联的用户 ID',
  token VARCHAR(64) NOT NULL COMMENT '登录令牌',
  login_type VARCHAR(32) NOT NULL COMMENT '登录类型：ADMIN_PASSWORD 或 WECHAT_MINI_PROGRAM',
  expires_at DATETIME NOT NULL COMMENT '过期时间',
  last_access_at DATETIME DEFAULT NULL COMMENT '最近访问时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0 未删除，1 已删除',
  UNIQUE KEY uk_user_session_token (token),
  KEY idx_user_session_user_id (user_id),
  KEY idx_user_session_expires_at (expires_at),
  CONSTRAINT fk_user_session_user_id FOREIGN KEY (user_id) REFERENCES app_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户会话表';

-- 默认管理员账号：admin / 123456
-- 密码哈希：SHA-256('123456') = 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92

INSERT INTO app_user (
  username,
  password_hash,
  nickname,
  user_type,
  status,
  deleted
)
SELECT
  'admin',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  '管理员',
  'ADMIN',
  'ENABLED',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM app_user WHERE username = 'admin' AND deleted = 0
);
