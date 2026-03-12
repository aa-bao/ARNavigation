package com.hospital.arnavigation.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 医院节点实体类
 */
@Data
@TableName("hospital_nodes")
public class HospitalNode implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("node_code")
    private String nodeCode;

    @TableField("node_name")
    private String nodeName;

    @TableField("floor")
    private Integer floor;

    @TableField("x_coordinate")
    private Double xCoordinate;

    @TableField("y_coordinate")
    private Double yCoordinate;

    @TableField("node_type")
    private String nodeType;

    @TableField("description")
    private String description;

    @TableField("qr_code_url")
    private String qrCodeUrl;

    @TableField(value = "is_active", fill = FieldFill.INSERT)
    @TableLogic
    private Integer isActive;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
