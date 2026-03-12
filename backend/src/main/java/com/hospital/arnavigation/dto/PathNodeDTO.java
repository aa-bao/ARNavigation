package com.hospital.arnavigation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 路径节点DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PathNodeDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long nodeId;
    private String nodeCode;
    private String nodeName;
    private Integer floor;
    private Double xCoordinate;
    private Double yCoordinate;
    private String nodeType;
    private Double distanceFromPrevious;
    private Double directionAngle;
    private String description;
}
