package com.hospital.arnavigation.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 导航请求DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NavigationRequestDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 起点节点ID
     */
    @NotNull(message = "起点节点ID不能为空")
    private Long startNodeId;

    /**
     * 终点节点ID
     */
    @NotNull(message = "终点节点ID不能为空")
    private Long endNodeId;

    /**
     * 是否优先选择电梯
     */
    private Boolean preferElevator = true;

    /**
     * 是否避免楼梯
     */
    private Boolean avoidStairs = true;
}
