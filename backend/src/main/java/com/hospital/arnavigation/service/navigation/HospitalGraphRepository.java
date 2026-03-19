package com.hospital.arnavigation.service.navigation;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hospital.arnavigation.entity.HospitalEdge;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.exception.NavigationException;
import com.hospital.arnavigation.mapper.HospitalEdgeMapper;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class HospitalGraphRepository {

    private final HospitalNodeMapper hospitalNodeMapper;
    private final HospitalEdgeMapper hospitalEdgeMapper;

    public HospitalGraph loadGraph() {
        List<HospitalNode> nodes = hospitalNodeMapper.selectList(
                new LambdaQueryWrapper<HospitalNode>()
                        .eq(HospitalNode::getIsActive, 1)
                        .orderByAsc(HospitalNode::getId)
        );

        Map<Long, HospitalNode> nodesById = new LinkedHashMap<>();
        Map<String, HospitalNode> nodesByCode = new LinkedHashMap<>();

        if (nodes != null) {
            for (HospitalNode node : nodes) {
                if (node == null || node.getId() == null) {
                    continue;
                }

                String nodeCode = node.getNodeCode();
                if (nodeCode == null || nodeCode.isBlank()) {
                    throw new NavigationException("Navigable nodes must have a non-empty nodeCode: nodeId=" + node.getId());
                }

                String normalizedCode = nodeCode.trim();
                if (nodesByCode.putIfAbsent(normalizedCode, node) != null) {
                    throw new NavigationException("Duplicate navigable nodeCode detected: " + normalizedCode);
                }

                nodesById.put(node.getId(), node);
            }
        }

        List<HospitalEdge> edges = hospitalEdgeMapper.selectList(
                new LambdaQueryWrapper<HospitalEdge>()
                        .eq(HospitalEdge::getIsAccessible, 1)
        );

        Map<Long, List<GraphEdge>> adjacency = new LinkedHashMap<>();
        if (edges != null) {
            for (HospitalEdge edge : edges) {
                if (edge == null || edge.getFromNodeId() == null || edge.getToNodeId() == null) {
                    continue;
                }
                if (!nodesById.containsKey(edge.getFromNodeId()) || !nodesById.containsKey(edge.getToNodeId())) {
                    continue;
                }

                double distance = edge.getDistance() == null ? 1.0d : edge.getDistance();
                boolean elevatorEdge = Integer.valueOf(1).equals(edge.getIsElevator());
                adjacency.computeIfAbsent(edge.getFromNodeId(), key -> new ArrayList<>())
                        .add(new GraphEdge(edge.getToNodeId(), distance, elevatorEdge));
            }
        }

        return new HospitalGraph(nodesById, nodesByCode, adjacency);
    }

    @Getter
    public static class HospitalGraph {
        private final Map<Long, HospitalNode> nodesById;
        private final Map<String, HospitalNode> nodesByCode;
        private final Map<Long, List<GraphEdge>> adjacency;

        private HospitalGraph(Map<Long, HospitalNode> nodesById,
                              Map<String, HospitalNode> nodesByCode,
                              Map<Long, List<GraphEdge>> adjacency) {
            this.nodesById = Collections.unmodifiableMap(new LinkedHashMap<>(nodesById));
            this.nodesByCode = Collections.unmodifiableMap(new LinkedHashMap<>(nodesByCode));
            this.adjacency = Collections.unmodifiableMap(new LinkedHashMap<>(adjacency));
        }

        public HospitalNode getNodeById(Long nodeId) {
            return nodeId == null ? null : nodesById.get(nodeId);
        }

        public HospitalNode getNodeByCode(String nodeCode) {
            return nodeCode == null ? null : nodesByCode.get(nodeCode.trim());
        }

        public List<GraphEdge> getEdgesFrom(Long nodeId) {
            return adjacency.getOrDefault(nodeId, Collections.emptyList());
        }
    }

    @Getter
    public static class GraphEdge {
        private final Long toNodeId;
        private final double distance;
        private final boolean elevator;

        public GraphEdge(Long toNodeId, double distance, boolean elevator) {
            this.toNodeId = toNodeId;
            this.distance = distance;
            this.elevator = elevator;
        }
    }
}
