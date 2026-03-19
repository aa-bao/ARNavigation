package com.hospital.arnavigation.service.navigation;

import com.hospital.arnavigation.entity.HospitalNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.PriorityQueue;
import java.util.Set;

@Component
public class AStarRoutePlanner {

    private static final double ELEVATOR_NODE_PENALTY = 15.0d;

    public List<HospitalNode> findRoute(HospitalGraphRepository.HospitalGraph graph, Long startNodeId, Long targetNodeId) {
        if (graph == null || startNodeId == null || targetNodeId == null) {
            return List.of();
        }

        HospitalNode startNode = graph.getNodeById(startNodeId);
        HospitalNode targetNode = graph.getNodeById(targetNodeId);
        if (startNode == null || targetNode == null) {
            return List.of();
        }

        if (Objects.equals(startNodeId, targetNodeId)) {
            return List.of(startNode);
        }

        PriorityQueue<RouteState> openSet = new PriorityQueue<>(Comparator.comparingDouble(RouteState::score));
        Map<Long, Double> bestScoreByNode = new HashMap<>();
        Map<Long, Long> parentByNode = new HashMap<>();
        Set<Long> closedSet = new HashSet<>();

        openSet.add(new RouteState(startNodeId, 0.0d, heuristic(startNode, targetNode)));
        bestScoreByNode.put(startNodeId, 0.0d);

        while (!openSet.isEmpty()) {
            RouteState current = openSet.poll();
            if (!closedSet.add(current.nodeId)) {
                continue;
            }

            if (Objects.equals(current.nodeId, targetNodeId)) {
                return reconstructPath(graph, parentByNode, current.nodeId);
            }

            for (HospitalGraphRepository.GraphEdge edge : graph.getEdgesFrom(current.nodeId)) {
                HospitalNode neighbor = graph.getNodeById(edge.getToNodeId());
                if (neighbor == null || closedSet.contains(neighbor.getId())) {
                    continue;
                }

                double tentativeG = current.gScore + edge.getDistance() + nodePenalty(neighbor);
                double bestKnown = bestScoreByNode.getOrDefault(neighbor.getId(), Double.POSITIVE_INFINITY);
                if (tentativeG >= bestKnown) {
                    continue;
                }

                bestScoreByNode.put(neighbor.getId(), tentativeG);
                parentByNode.put(neighbor.getId(), current.nodeId);
                openSet.add(new RouteState(neighbor.getId(), tentativeG, heuristic(neighbor, targetNode)));
            }
        }

        return List.of();
    }

    private List<HospitalNode> reconstructPath(HospitalGraphRepository.HospitalGraph graph,
                                               Map<Long, Long> parentByNode,
                                               Long terminalNodeId) {
        List<HospitalNode> reversed = new ArrayList<>();
        Long currentNodeId = terminalNodeId;
        while (currentNodeId != null) {
            HospitalNode currentNode = graph.getNodeById(currentNodeId);
            if (currentNode == null) {
                return List.of();
            }
            reversed.add(currentNode);
            currentNodeId = parentByNode.get(currentNodeId);
        }

        List<HospitalNode> path = new ArrayList<>(reversed.size());
        for (int index = reversed.size() - 1; index >= 0; index--) {
            path.add(reversed.get(index));
        }
        return path;
    }

    private double heuristic(HospitalNode from, HospitalNode to) {
        if (from == null || to == null || from.getXCoordinate() == null || from.getYCoordinate() == null
                || to.getXCoordinate() == null || to.getYCoordinate() == null) {
            return 0.0d;
        }

        double dx = from.getXCoordinate() - to.getXCoordinate();
        double dz = from.getYCoordinate() - to.getYCoordinate();
        double dy = ((from.getFloor() == null ? 0 : from.getFloor())
                - (to.getFloor() == null ? 0 : to.getFloor())) * 4.5d;

        return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
    }

    private double nodePenalty(HospitalNode node) {
        if (node == null || node.getNodeType() == null) {
            return 0.0d;
        }
        return "ELEVATOR".equalsIgnoreCase(node.getNodeType()) ? ELEVATOR_NODE_PENALTY : 0.0d;
    }

    private record RouteState(Long nodeId, double gScore, double hScore) {
        double score() {
            return gScore + hScore;
        }
    }
}
