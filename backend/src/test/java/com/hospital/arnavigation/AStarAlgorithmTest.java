package com.hospital.arnavigation;

import com.hospital.arnavigation.dto.NavigationResponseDTO;
import com.hospital.arnavigation.dto.PathNodeDTO;
import com.hospital.arnavigation.entity.HospitalEdge;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.mapper.HospitalEdgeMapper;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.service.impl.AStarPathFindingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * A*算法单元测试类
 * 测试同楼层路径、跨楼层路径、不可达路径等场景
 */
public class AStarAlgorithmTest {

    @Mock
    private HospitalNodeMapper hospitalNodeMapper;

    @Mock
    private HospitalEdgeMapper hospitalEdgeMapper;

    @InjectMocks
    private AStarPathFindingServiceImpl pathFindingService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    /**
     * 创建测试节点
     */
    private HospitalNode createNode(Long id, String code, String name,
                                     Integer floor, Double x, Double y, String type) {
        HospitalNode node = new HospitalNode();
        node.setId(id);
        node.setNodeCode(code);
        node.setNodeName(name);
        node.setFloor(floor);
        node.setXCoordinate(x);
        node.setYCoordinate(y);
        node.setNodeType(type);
        return node;
    }

    /**
     * 创建测试边
     */
    private HospitalEdge createEdge(Long id, Long fromId, Long toId,
                                     Double distance, Integer isElevator) {
        HospitalEdge edge = new HospitalEdge();
        edge.setId(id);
        edge.setFromNodeId(fromId);
        edge.setToNodeId(toId);
        edge.setDistance(distance);
        edge.setIsAccessible(1);
        edge.setIsElevator(isElevator);
        return edge;
    }

    @Test
    @DisplayName("测试用例1：同楼层最短路径")
    void testSameFloorShortestPath() {
        // 创建1层测试节点
        HospitalNode entrance = createNode(1L, "ENT-001", "正门入口", 1, 0.0, 0.0, "ENTRANCE");
        HospitalNode reception = createNode(2L, "REC-001", "总服务台", 1, 20.0, 10.0, "RECEPTION");
        HospitalNode pharmacy = createNode(3L, "PHA-001", "中药房", 1, 90.0, 40.0, "PHARMACY");
        HospitalNode elevator = createNode(4L, "EL-001", "电梯A", 1, 30.0, 30.0, "ELEVATOR");

        // 创建边连接
        HospitalEdge e1 = createEdge(1L, 1L, 2L, 22.4, 0);
        HospitalEdge e2 = createEdge(2L, 2L, 4L, 22.4, 0);
        HospitalEdge e3 = createEdge(3L, 2L, 3L, 72.1, 0);
        HospitalEdge e4 = createEdge(4L, 4L, 3L, 63.2, 0);

        // 配置Mock
        when(hospitalNodeMapper.selectById(1L)).thenReturn(entrance);
        when(hospitalNodeMapper.selectById(2L)).thenReturn(reception);
        when(hospitalNodeMapper.selectById(3L)).thenReturn(pharmacy);
        when(hospitalNodeMapper.selectById(4L)).thenReturn(elevator);

        when(hospitalEdgeMapper.selectList(any()))
            .thenAnswer(invocation -> {
                var wrapper = invocation.getArgument(0, com.baomidou.mybatisplus.core.conditions.Wrapper.class);
                // 根据查询条件返回不同的边列表
                return Arrays.asList(e1, e2, e3, e4);
            });

        // 执行测试
        NavigationResponseDTO result = pathFindingService.findShortestPath(1L, 3L);

        // 验证结果
        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertNotNull(result.getPathNodes());
        assertTrue(result.getPathNodes().size() > 0);

        // 验证路径连续性
        List<PathNodeDTO> path = result.getPathNodes();
        for (int i = 0; i < path.size() - 1; i++) {
            assertNotNull(path.get(i));
            assertNotNull(path.get(i + 1));
        }

        // 验证总距离合理
        assertTrue(result.getDistance() > 0);
        assertTrue(result.getEstimatedTime() >= 0);
    }

    @Test
    @DisplayName("测试用例2：跨楼层路径（使用电梯）")
    void testCrossFloorPathWithElevator() {
        // 创建跨楼层节点
        HospitalNode entranceF1 = createNode(1L, "ENT-001", "正门入口", 1, 0.0, 0.0, "ENTRANCE");
        HospitalNode elevatorF1 = createNode(2L, "EL-001-F1", "电梯A-1层", 1, 30.0, 30.0, "ELEVATOR");
        HospitalNode elevatorF3 = createNode(3L, "EL-001-F3", "电梯A-3层", 3, 30.0, 30.0, "ELEVATOR");
        HospitalNode ctRoom = createNode(4L, "RM-305", "CT室", 3, 90.0, 10.0, "ROOM");

        // 创建边（包含电梯跨楼层边）
        HospitalEdge e1 = createEdge(1L, 1L, 2L, 42.4, 0);    // 入口->电梯F1
        HospitalEdge e2 = createEdge(2L, 2L, 3L, 0.0, 1);    // 电梯F1->电梯F3 (电梯)
        HospitalEdge e3 = createEdge(3L, 3L, 4L, 63.2, 0);  // 电梯F3->CT室

        // 配置Mock
        when(hospitalNodeMapper.selectById(1L)).thenReturn(entranceF1);
        when(hospitalNodeMapper.selectById(2L)).thenReturn(elevatorF1);
        when(hospitalNodeMapper.selectById(3L)).thenReturn(elevatorF3);
        when(hospitalNodeMapper.selectById(4L)).thenReturn(ctRoom);

        when(hospitalEdgeMapper.selectList(any()))
            .thenAnswer(invocation -> Arrays.asList(e1, e2, e3));

        // 执行测试
        NavigationResponseDTO result = pathFindingService.findShortestPath(1L, 4L);

        // 验证结果
        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertNotNull(result.getPathNodes());

        // 验证路径包含跨楼层
        List<PathNodeDTO> path = result.getPathNodes();
        assertTrue(path.size() >= 4, "跨楼层路径应该包含至少4个节点");

        // 验证楼层变化
        boolean hasFloorChange = false;
        for (int i = 0; i < path.size() - 1; i++) {
            if (!path.get(i).getFloor().equals(path.get(i + 1).getFloor())) {
                hasFloorChange = true;
                break;
            }
        }
        assertTrue(hasFloorChange, "跨楼层路径应该包含楼层变化");
    }

    @Test
    @DisplayName("测试用例3：不可达路径（应该返回错误）")
    void testUnreachablePath() {
        // 创建孤立节点
        HospitalNode isolatedNode1 = createNode(1L, "ISO-001", "孤立节点1", 1, 0.0, 0.0, "ROOM");
        HospitalNode isolatedNode2 = createNode(2L, "ISO-002", "孤立节点2", 1, 100.0, 100.0, "ROOM");

        // 没有边连接这两个节点

        // 配置Mock
        when(hospitalNodeMapper.selectById(1L)).thenReturn(isolatedNode1);
        when(hospitalNodeMapper.selectById(2L)).thenReturn(isolatedNode2);
        when(hospitalEdgeMapper.selectList(any())).thenReturn(Collections.emptyList());

        // 执行测试
        NavigationResponseDTO result = pathFindingService.findShortestPath(1L, 2L);

        // 验证结果
        assertNotNull(result);
        assertEquals("ERROR", result.getStatus());
        assertNotNull(result.getErrorMessage());
        assertTrue(result.getErrorMessage().contains("未找到") || result.getErrorMessage().contains("不可达"));
    }

    @Test
    @DisplayName("测试用例4：起点等于终点（应该返回空路径）")
    void testSameStartAndEnd() {
        // 创建单个节点
        HospitalNode node = createNode(1L, "ENT-001", "正门入口", 1, 0.0, 0.0, "ENTRANCE");

        // 配置Mock
        when(hospitalNodeMapper.selectById(1L)).thenReturn(node);

        // 执行测试 - 起点等于终点
        NavigationResponseDTO result = pathFindingService.findShortestPath(1L, 1L);

        // 验证结果
        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertNotNull(result.getPathNodes());
        // 起点等于终点时，路径应该只包含一个节点
        assertEquals(1, result.getPathNodes().size());
        assertEquals(1L, result.getPathNodes().get(0).getNodeId());
        assertEquals(0.0, result.getDistance());
        assertEquals(0, result.getEstimatedTime());
    }

    @Test
    @DisplayName("验证路径的连续性和正确性")
    void testPathContinuityAndCorrectness() {
        // 创建一个线性路径网络: A -> B -> C -> D
        HospitalNode nodeA = createNode(1L, "A", "节点A", 1, 0.0, 0.0, "ROOM");
        HospitalNode nodeB = createNode(2L, "B", "节点B", 1, 10.0, 0.0, "ROOM");
        HospitalNode nodeC = createNode(3L, "C", "节点C", 1, 20.0, 0.0, "ROOM");
        HospitalNode nodeD = createNode(4L, "D", "节点D", 1, 30.0, 0.0, "ROOM");

        HospitalEdge e1 = createEdge(1L, 1L, 2L, 10.0, 0);
        HospitalEdge e2 = createEdge(2L, 2L, 3L, 10.0, 0);
        HospitalEdge e3 = createEdge(3L, 3L, 4L, 10.0, 0);

        // 配置Mock
        when(hospitalNodeMapper.selectById(1L)).thenReturn(nodeA);
        when(hospitalNodeMapper.selectById(2L)).thenReturn(nodeB);
        when(hospitalNodeMapper.selectById(3L)).thenReturn(nodeC);
        when(hospitalNodeMapper.selectById(4L)).thenReturn(nodeD);

        when(hospitalEdgeMapper.selectList(any()))
            .thenAnswer(invocation -> {
                Long nodeId = 1L; // 简化处理，实际应根据wrapper条件判断
                if (nodeId == 1L) return Collections.singletonList(e1);
                if (nodeId == 2L) return Collections.singletonList(e2);
                if (nodeId == 3L) return Collections.singletonList(e3);
                return Collections.emptyList();
            });

        // 执行测试
        NavigationResponseDTO result = pathFindingService.findShortestPath(1L, 4L);

        // 验证路径连续性和正确性
        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());

        List<PathNodeDTO> path = result.getPathNodes();
        assertNotNull(path);
        assertEquals(4, path.size()); // A->B->C->D

        // 验证每个节点的ID顺序正确
        assertEquals(1L, path.get(0).getNodeId());
        assertEquals(2L, path.get(1).getNodeId());
        assertEquals(3L, path.get(2).getNodeId());
        assertEquals(4L, path.get(3).getNodeId());

        // 验证节点名称正确
        assertEquals("节点A", path.get(0).getNodeName());
        assertEquals("节点B", path.get(1).getNodeName());
        assertEquals("节点C", path.get(2).getNodeName());
        assertEquals("节点D", path.get(3).getNodeName());

        // 验证距离和耗时
        assertEquals(30.0, result.getDistance(), 0.1); // 10+10+10=30米
        assertTrue(result.getEstimatedTime() > 0);

        // 验证导航指令不为空
        assertNotNull(result.getDirections());
    }
}
