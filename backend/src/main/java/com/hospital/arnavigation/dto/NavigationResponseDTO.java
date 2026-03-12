package com.hospital.arnavigation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * 导航响应DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NavigationResponseDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 路径节点集合
     */
    private List<PathNodeDTO> pathNodes;

    /**
     * 总距离(米)
     */
    private Double distance;

    /**
     * 预计耗时(秒)
     */
    private Integer estimatedTime;

    /**
     * 导航文字说明
     */
    private List<String> directions;

    /**
     * 状态信息
     */
    private String status;

    /**
     * 错误信息(如无错误则为null)
     */
    private String errorMessage;
}
