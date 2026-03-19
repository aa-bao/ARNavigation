package com.hospital.arnavigation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NavigationDestinationDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long nodeId;
    private String nodeCode;
    private String nodeName;
    private Integer floor;
    private String nodeType;
    private String description;
    private Boolean recommended;
}
