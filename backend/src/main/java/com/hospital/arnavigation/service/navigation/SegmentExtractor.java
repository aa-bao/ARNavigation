package com.hospital.arnavigation.service.navigation;

import com.hospital.arnavigation.dto.NavigationPointDTO;
import com.hospital.arnavigation.dto.NavigationSegmentResponseDTO;
import com.hospital.arnavigation.entity.HospitalNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class SegmentExtractor {

    private final NavigationPointAssembler pointAssembler;

    public SegmentExtractor(NavigationPointAssembler pointAssembler) {
        this.pointAssembler = pointAssembler;
    }

    public NavigationSegmentResponseDTO extract(List<HospitalNode> route) {
        if (route == null || route.isEmpty()) {
            return NavigationSegmentResponseDTO.builder()
                    .status("ERROR")
                    .errorMessage("No route points available for segment extraction")
                    .segmentPoints(Collections.emptyList())
                    .build();
        }

        List<HospitalNode> segmentNodes = route.size() == 1 ? route : route.subList(0, 2);
        List<NavigationPointDTO> segmentPoints = new ArrayList<>(segmentNodes.size());

        for (int index = 0; index < segmentNodes.size(); index++) {
            NavigationPointDTO point = pointAssembler.toPointDto(segmentNodes.get(index));
            point.setDistanceFromPrevious(index == 0 ? 0.0d : null);
            point.setDirectionAngle(index == 0 ? 0.0d : null);
            segmentPoints.add(point);
        }

        return NavigationSegmentResponseDTO.builder()
                .status("SUCCESS")
                .segmentStart(segmentPoints.get(0))
                .segmentEnd(segmentPoints.get(segmentPoints.size() - 1))
                .segmentPoints(segmentPoints)
                .isFinalSegment(route.size() <= 2)
                .build();
    }
}
