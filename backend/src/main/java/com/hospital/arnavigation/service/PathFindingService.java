package com.hospital.arnavigation.service;

import com.hospital.arnavigation.dto.PathNodeDTO;
import com.hospital.arnavigation.dto.NavigationResponseDTO;
import com.hospital.arnavigation.entity.HospitalNode;

import java.util.List;

/**
 * 路径规划服务接口
 */
public interface PathFindingService {

    /**
     * 使用A*算法寻找最短路径
     * @param startNodeId 起点ID
     * @param endNodeId 终点ID
     * @return 路径规划结果
     */
    NavigationResponseDTO findShortestPath(Long startNodeId, Long endNodeId);

    /**
     * 根据节点ID获取节点信息
     * @param nodeId 节点ID
     * @return 节点信息
     */
    HospitalNode getNodeById(Long nodeId);

    /**
     * 获取所有相邻节点
     * @param nodeId 节点ID
     * @return 相邻节点列表
     */
    List<PathNodeDTO> getNeighbors(Long nodeId);

    /**
     * 计算两个节点之间的欧几里得距离
     * @param node1 节点1
     * @param node2 节点2
     * @return 距离
     */
    double calculateEuclideanDistance(HospitalNode node1, HospitalNode node2);
}
