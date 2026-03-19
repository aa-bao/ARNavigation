package com.hospital.arnavigation.service.impl;

import com.hospital.arnavigation.dto.NavigationNodeDTO;
import com.hospital.arnavigation.dto.NavigationSegmentResponseDTO;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.exception.NavigationException;
import com.hospital.arnavigation.service.NavigationSegmentService;
import com.hospital.arnavigation.service.navigation.AStarRoutePlanner;
import com.hospital.arnavigation.service.navigation.HospitalGraphRepository;
import com.hospital.arnavigation.service.navigation.NavigationPointAssembler;
import com.hospital.arnavigation.service.navigation.SegmentExtractor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NavigationSegmentServiceImpl implements NavigationSegmentService {

    private final HospitalGraphRepository graphRepository;
    private final AStarRoutePlanner routePlanner;
    private final SegmentExtractor segmentExtractor;
    private final NavigationPointAssembler pointAssembler;

    @Override
    public NavigationNodeDTO findNormalizedNodeByCode(String nodeCode) {
        if (nodeCode == null || nodeCode.isBlank()) {
            return null;
        }

        HospitalGraphRepository.HospitalGraph graph = graphRepository.loadGraph();
        HospitalNode node = graph.getNodeByCode(nodeCode);
        return pointAssembler.toNodeDto(node);
    }

    @Override
    public NavigationSegmentResponseDTO buildSegment(String startCode, Long targetId) {
        if (startCode == null || startCode.isBlank()) {
            return error("startCode cannot be blank");
        }
        if (targetId == null) {
            return error("targetId cannot be null");
        }

        HospitalGraphRepository.HospitalGraph graph;
        try {
            graph = graphRepository.loadGraph();
        } catch (NavigationException e) {
            return error(e.getMessage());
        }

        HospitalNode startNode = graph.getNodeByCode(startCode.trim());
        if (startNode == null) {
            return error("startCode not found: " + startCode);
        }

        HospitalNode targetNode = graph.getNodeById(targetId);
        if (targetNode == null) {
            return error("targetId not found: " + targetId);
        }

        List<HospitalNode> route = routePlanner.findRoute(graph, startNode.getId(), targetNode.getId());
        if (route.isEmpty()) {
            return error("No navigable route found between " + startCode + " and " + targetId);
        }

        return segmentExtractor.extract(route);
    }

    private NavigationSegmentResponseDTO error(String message) {
        return NavigationSegmentResponseDTO.builder()
                .status("ERROR")
                .errorMessage(message)
                .segmentPoints(List.of())
                .build();
    }
}
