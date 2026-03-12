package com.hospital.arnavigation.service.impl;

import com.hospital.arnavigation.dto.NavigationResponseDTO;
import com.hospital.arnavigation.dto.PathNodeDTO;
import com.hospital.arnavigation.entity.HospitalEdge;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.mapper.HospitalEdgeMapper;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.service.PathFindingService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * A*算法路径规划服务实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AStarPathFindingServiceImpl implements PathFindingService {

    private final HospitalNodeMapper hospitalNodeMapper;
    private final HospitalEdgeMapper hospitalEdgeMapper;

    /**
     * A*算法节点类
     */
    private static class AStarNode {
        HospitalNode node;
        double g; // 从起点到当前节点的实际代价
        double h; // 从当前节点到目标的估计代价
        double f; // f = g + h
        AStarNode parent;
        Double directionFromParent; // 从上一节点到当前节点的方向角
        Double distanceFromParent; // 从上一节点到当前节点的距离

        AStarNode(HospitalNode node, double g, double h, AStarNode parent) {
            this.node = node;
            this.g = g;
            this.h = h;
            this.f = g + h;
            this.parent = parent;
        }
    }

    @Override
    public NavigationResponseDTO findShortestPath(Long startNodeId, Long endNodeId) {
        log.info("开始路径规划: 起点={}, 终点={}", startNodeId, endNodeId);

        // 边界条件检查
        if (startNodeId == null || endNodeId == null) {
            log.warn("路径规划失败: 起点或终点ID为空");
            return NavigationResponseDTO.builder()
                    .status("ERROR")
                    .errorMessage("起点和终点ID不能为空")
                    .build();
        }

        if (startNodeId.equals(endNodeId)) {
            log.warn("路径规划: 起点和终点相同, nodeId={}", startNodeId);
            HospitalNode node = getNodeById(startNodeId);
            if (node == null) {
                return NavigationResponseDTO.builder()
                        .status("ERROR")
                        .errorMessage("节点不存在")
                        .build();
            }
            // 返回单节点路径
            return buildSingleNodeResponse(node);
        }

        HospitalNode startNode = getNodeById(startNodeId);
        HospitalNode endNode = getNodeById(endNodeId);

        if (startNode == null || endNode == null) {
            log.warn("路径规划失败: 起点或终点节点不存在, startNodeId={}, endNodeId={}", startNodeId, endNodeId);
            return NavigationResponseDTO.builder()
                    .status("ERROR")
                    .errorMessage("起点或终点节点不存在")
                    .build();
        }

        // 检查节点是否被删除
        if (startNode.getIsActive() == null || startNode.getIsActive() == 0) {
            log.warn("路径规划失败: 起点节点已被删除, startNodeId={}", startNodeId);
            return NavigationResponseDTO.builder()
                    .status("ERROR")
                    .errorMessage("起点节点已被删除")
                    .build();
        }
        if (endNode.getIsActive() == null || endNode.getIsActive() == 0) {
            log.warn("路径规划失败: 终点节点已被删除, endNodeId={}", endNodeId);
            return NavigationResponseDTO.builder()
                    .status("ERROR")
                    .errorMessage("终点节点已被删除")
                    .build();
        }

        // A*算法实现
        PriorityQueue<AStarNode> openSet = new PriorityQueue<>(Comparator.comparingDouble(n -> n.f));
        Set<Long> closedSet = new HashSet<>();
        Map<Long, Double> gScoreMap = new HashMap<>();

        AStarNode startAStarNode = new AStarNode(startNode, 0,
                calculateEuclideanDistance(startNode, endNode), null);
        openSet.add(startAStarNode);
        gScoreMap.put(startNodeId, 0.0);

        while (!openSet.isEmpty()) {
            AStarNode current = openSet.poll();

            if (current.node.getId().equals(endNodeId)) {
                log.info("找到路径，开始构建响应");
                return buildNavigationResponse(current);
            }

            closedSet.add(current.node.getId());

            for (PathNodeDTO neighborDTO : getNeighbors(current.node.getId())) {
                HospitalNode neighborNode = getNodeById(neighborDTO.getNodeId());
                if (neighborNode == null || closedSet.contains(neighborNode.getId())) {
                    continue;
                }

                double tentativeG = current.g + neighborDTO.getDistanceFromPrevious();

                if (!gScoreMap.containsKey(neighborNode.getId()) || tentativeG < gScoreMap.get(neighborNode.getId())) {
                    gScoreMap.put(neighborNode.getId(), tentativeG);
                    double h = calculateEuclideanDistance(neighborNode, endNode);
                    AStarNode neighborAStarNode = new AStarNode(neighborNode, tentativeG, h, current);
                    neighborAStarNode.directionFromParent = neighborDTO.getDirectionAngle();
                    neighborAStarNode.distanceFromParent = neighborDTO.getDistanceFromPrevious();
                    openSet.add(neighborAStarNode);
                }
            }
        }

        log.warn("未找到可行路径: 起点={}, 终点={}", startNodeId, endNodeId);
        return NavigationResponseDTO.builder()
                .status("ERROR")
                .errorMessage("未找到可行路径")
                .build();
    }

    /**
     * 构建单节点响应（起点和终点相同的情况）
     * @param node 节点
     * @return 导航响应
     */
    private NavigationResponseDTO buildSingleNodeResponse(HospitalNode node) {
        PathNodeDTO pathNode = PathNodeDTO.builder()
                .nodeId(node.getId())
                .nodeCode(node.getNodeCode())
                .nodeName(node.getNodeName())
                .floor(node.getFloor())
                .xCoordinate(node.getXCoordinate())
                .yCoordinate(node.getYCoordinate())
                .nodeType(node.getNodeType())
                .description(node.getDescription())
                .distanceFromPrevious(0.0)
                .directionAngle(0.0)
                .build();

        return NavigationResponseDTO.builder()
                .status("SUCCESS")
                .pathNodes(java.util.Collections.singletonList(pathNode))
                .distance(0.0)
                .estimatedTime(0)
                .directions(java.util.Collections.singletonList("已到达目标位置"))
                .build();
    }

    private NavigationResponseDTO buildNavigationResponse(AStarNode endNode) {
        List<PathNodeDTO> pathNodes = new ArrayList<>();
        List<String> directions = new ArrayList<>();
        double totalDistance = 0.0;

        AStarNode current = endNode;
        Deque<AStarNode> stack = new ArrayDeque<>();
        while (current != null) {
            stack.push(current);
            current = current.parent;
        }

        int step = 0;
        AStarNode prev = null;
        while (!stack.isEmpty()) {
            AStarNode astarNode = stack.pop();
            HospitalNode node = astarNode.node;

            PathNodeDTO pathNode = PathNodeDTO.builder()
                    .nodeId(node.getId())
                    .nodeCode(node.getNodeCode())
                    .nodeName(node.getNodeName())
                    .floor(node.getFloor())
                    .xCoordinate(node.getXCoordinate())
                    .yCoordinate(node.getYCoordinate())
                    .nodeType(node.getNodeType())
                    .description(node.getDescription())
                    .distanceFromPrevious(astarNode.distanceFromParent != null ? astarNode.distanceFromParent : 0.0)
                    .directionAngle(astarNode.directionFromParent)
                    .build();
            pathNodes.add(pathNode);

            if (astarNode.distanceFromParent != null) {
                totalDistance += astarNode.distanceFromParent;
            }

            // 生成导航指令
            if (prev != null) {
                step++;
                String direction = generateDirectionInstruction(prev, astarNode, step);
                directions.add(direction);
            }
            prev = astarNode;
        }

        // 预计耗时（假设步行速度为1.5米/秒）
        int estimatedTime = (int) (totalDistance / 1.5);

        return NavigationResponseDTO.builder()
                .status("SUCCESS")
                .pathNodes(pathNodes)
                .distance(totalDistance)
                .estimatedTime(estimatedTime)
                .directions(directions)
                .build();
    }

    private String generateDirectionInstruction(AStarNode from, AStarNode to, int step) {
        StringBuilder sb = new StringBuilder();
        sb.append("第").append(step).append("步: ");

        HospitalNode fromNode = from.node;
        HospitalNode toNode = to.node;

        // 检查楼层变化
        if (!Objects.equals(fromNode.getFloor(), toNode.getFloor())) {
            if (to.directionFromParent != null && to.directionFromParent == 0 && to.distanceFromParent == 0) {
                sb.append("乘坐电梯或走楼梯");
                if (toNode.getFloor() > fromNode.getFloor()) {
                    sb.append("上");
                } else {
                    sb.append("下");
                }
                sb.append(Math.abs(toNode.getFloor() - fromNode.getFloor())).append("层");
            }
        } else {
            sb.append("从「").append(fromNode.getNodeName()).append("」");
            sb.append("向「").append(toNode.getNodeName()).append("」移动");
            if (to.distanceFromParent != null) {
                sb.append(String.format("(约%.1f米)", to.distanceFromParent));
            }
        }

        return sb.toString();
    }

    @Override
    public HospitalNode getNodeById(Long nodeId) {
        if (nodeId == null) {
            return null;
        }
        try {
            return hospitalNodeMapper.selectById(nodeId);
        } catch (Exception e) {
            log.error("获取节点信息失败: nodeId={}, error={}", nodeId, e.getMessage());
            return null;
        }
    }

    @Override
    public List<PathNodeDTO> getNeighbors(Long nodeId) {
        if (nodeId == null) {
            log.warn("获取相邻节点失败: nodeId为空");
            return new ArrayList<>();
        }

        try {
            LambdaQueryWrapper<HospitalEdge> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(HospitalEdge::getFromNodeId, nodeId)
                       .eq(HospitalEdge::getIsAccessible, 1);

            List<HospitalEdge> edges = hospitalEdgeMapper.selectList(queryWrapper);
            List<PathNodeDTO> neighbors = new ArrayList<>();

            for (HospitalEdge edge : edges) {
                if (edge == null || edge.getToNodeId() == null) {
                    continue;
                }
                HospitalNode neighborNode = hospitalNodeMapper.selectById(edge.getToNodeId());
                if (neighborNode != null && neighborNode.getIsActive() != null && neighborNode.getIsActive() == 1) {
                    neighbors.add(PathNodeDTO.builder()
                            .nodeId(neighborNode.getId())
                            .nodeCode(neighborNode.getNodeCode())
                            .nodeName(neighborNode.getNodeName())
                            .floor(neighborNode.getFloor())
                            .xCoordinate(neighborNode.getXCoordinate())
                            .yCoordinate(neighborNode.getYCoordinate())
                            .nodeType(neighborNode.getNodeType())
                            .distanceFromPrevious(edge.getDistance())
                            .directionAngle(edge.getDirectionAngle())
                            .build());
                }
            }

            return neighbors;
        } catch (Exception e) {
            log.error("获取相邻节点失败: nodeId={}, error={}", nodeId, e.getMessage());
            return new ArrayList<>();
        }
    }

    @Override
    public double calculateEuclideanDistance(HospitalNode node1, HospitalNode node2) {
        if (node1 == null || node2 == null) {
            log.warn("计算欧几里得距离失败: 节点为空");
            return Double.MAX_VALUE;
        }

        if (node1.getXCoordinate() == null || node1.getYCoordinate() == null ||
            node2.getXCoordinate() == null || node2.getYCoordinate() == null) {
            log.warn("计算欧几里得距离失败: 节点坐标为空, node1Id={}, node2Id={}",
                    node1.getId(), node2.getId());
            return Double.MAX_VALUE;
        }

        try {
            // 如果楼层不同，添加额外的代价
            double floorPenalty = 0;
            if (node1.getFloor() != null && node2.getFloor() != null &&
                !Objects.equals(node1.getFloor(), node2.getFloor())) {
                floorPenalty = Math.abs(node1.getFloor() - node2.getFloor()) * 20;
            }

            double dx = node1.getXCoordinate() - node2.getXCoordinate();
            double dy = node1.getYCoordinate() - node2.getYCoordinate();

            return Math.sqrt(dx * dx + dy * dy) + floorPenalty;
        } catch (Exception e) {
            log.error("计算欧几里得距离失败: node1Id={}, node2Id={}, error={}",
                    node1.getId(), node2.getId(), e.getMessage());
            return Double.MAX_VALUE;
        }
    }
}
