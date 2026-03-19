package com.hospital.arnavigation.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("user_recent_nav")
public class UserRecentNavigation implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("node_id")
    private Long nodeId;

    @TableField("node_code")
    private String nodeCode;

    @TableField("node_name")
    private String nodeName;

    @TableField("floor")
    private Integer floor;

    @TableField("node_type")
    private String nodeType;

    @TableField("description")
    private String description;

    @TableField("last_navigated_at")
    private LocalDateTime lastNavigatedAt;

    @TableField("created_at")
    private LocalDateTime createdAt;

    @TableField("updated_at")
    private LocalDateTime updatedAt;
}
