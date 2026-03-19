package com.hospital.arnavigation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NavigationSegmentResponseDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private NavigationPointDTO segmentStart;
    private NavigationPointDTO segmentEnd;
    private List<NavigationPointDTO> segmentPoints;
    private Boolean isFinalSegment;
    private String status;
    private String errorMessage;
}
