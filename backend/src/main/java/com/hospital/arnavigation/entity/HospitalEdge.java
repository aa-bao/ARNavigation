package com.hospital.arnavigation.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 医院边实体类
 */
@Data
@TableName("hospital_edges")
public class HospitalEdge implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("from_node_id")
    private Long fromNodeId;

    @TableField("to_node_id")
    private Long toNodeId;

    @TableField("distance")
    private Double distance;

    @TableField("is_accessible")
    private Integer isAccessible;

    @TableField("is_stairs")
    private Integer isStairs;

    @TableField("is_elevator")
    private Integer isElevator;

    @TableField("direction_angle")
    private Double directionAngle;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
