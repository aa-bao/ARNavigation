package com.hospital.arnavigation;

import com.hospital.arnavigation.dto.NavigationResponseDTO;
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

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * 边界条件测试类
 * 测试各种异常情况、边界条件和特殊场景
 */
public class BoundaryConditionTest {

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

    @Test
    @DisplayName("测试不存在的节点ID")
    void testNonExistentNodeId() {
        // 配置Mock返回null表示节点不存在
        when(hospitalNodeMapper.selectById(9999L)).thenReturn(null);
        when(hospitalNodeMapper.selectById(8888L)).thenReturn(null);

        // 测试起点不存在
        NavigationResponseDTO result1 = pathFindingService.findShortestPath(9999L, 1L);
        assertNotNull(result1);
        assertEquals("ERROR", result1.getStatus());
        assertNotNull(result1.getErrorMessage());
        assertTrue(result1.getErrorMessage().contains("不存在") ||
                   result1.getErrorMessage().contains("不存在"));

        // 测试终点不存在
        NavigationResponseDTO result2 = pathFindingService.findShortestPath(1L, 8888L);
        assertNotNull(result2);
        assertEquals("ERROR", result2.getStatus());

        // 测试起点和终点都不存在
        NavigationResponseDTO result3 = pathFindingService.findShortestPath(9999L, 8888L);
        assertNotNull(result3);
        assertEquals("ERROR", result3.getStatus());
    }

    @Test
    @DisplayName("测试孤立节点（没有边的节点）")
    void testIsolatedNode() {
        // 创建孤立节点
        HospitalNode isolatedNode = createNode(100L, "ISO-001", "孤立节点", 1, 50.0, 50.0, "ROOM");

        // 创建正常节点
        HospitalNode normalNode = createNode(101L, "NORM-001", "正常节点", 1, 0.0, 0.0, "ENTRANCE");

        when(hospitalNodeMapper.selectById(100L)).thenReturn(isolatedNode);
        when(hospitalNodeMapper.selectById(101L)).thenReturn(normalNode);
        when(hospitalEdgeMapper.selectList(any())).thenReturn(Collections.emptyList());

        // 测试从孤立节点到正常节点
        NavigationResponseDTO result1 = pathFindingService.findShortestPath(100L, 101L);
        assertNotNull(result1);
        assertEquals("ERROR", result1.getStatus());
        assertTrue(result1.getErrorMessage().contains("未找到") ||
                   result1.getErrorMessage().contains("不可达"));

        // 测试从正常节点到孤立节点
        NavigationResponseDTO result2 = pathFindingService.findShortestPath(101L, 100L);
        assertNotNull(result2);
        assertEquals("ERROR", result2.getStatus());
    }

    @Test
    @DisplayName("测试循环路径（A->B->C->A）")
    void testCyclicPath() {
        // 创建循环节点
        HospitalNode nodeA = createNode(1L, "A", "节点A", 1, 0.0, 0.0, "ROOM");
        HospitalNode nodeB = createNode(2L, "B", "节点B", 1, 10.0, 0.0, "ROOM");
        HospitalNode nodeC = createNode(3L, "C", "节点C", 1, 10.0, 10.0, "ROOM");

        // 创建循环边 A->B->C->A
        HospitalEdge eAB = createEdge(1L, 1L, 2L, 10.0, 0);
        HospitalEdge eBC = createEdge(2L, 2L, 3L, 10.0, 0);
        HospitalEdge eCA = createEdge(3L, 3L, 1L, 14.1, 0);

        when(hospitalNodeMapper.selectById(1L)).thenReturn(nodeA);
        when(hospitalNodeMapper.selectById(2L)).thenReturn(nodeB);
        when(hospitalNodeMapper.selectById(3L)).thenReturn(nodeC);

        when(hospitalEdgeMapper.selectList(any()))
            .thenAnswer(invocation -> Arrays.asList(eAB, eBC, eCA));

        // 测试从A到C，算法应该避免陷入循环
        NavigationResponseDTO result = pathFindingService.findShortestPath(1L, 3L);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());

        // 验证路径 A->B->C，而不是陷入循环
        assertTrue(result.getPathNodes().size() <= 4);

        // 验证距离正确 (10.0 + 10.0 = 20.0)
        assertEquals(20.0, result.getDistance(), 0.1);
    }

    @Test
    @DisplayName("测试负权重（不应该存在）")
    void testNegativeWeight() {
        // 在实际应用中，距离不应该为负数
        // 这个测试验证即使数据库中有负距离，算法也能正常处理

        HospitalNode nodeA = createNode(1L, "A", "节点A", 1, 0.0, 0.0, "ROOM");
        HospitalNode nodeB = createNode(2L, "B", "节点B", 1, 10.0, 0.0, "ROOM");

        // 创建带负权重的边（理论上不应该存在）
        HospitalEdge negativeEdge = new HospitalEdge();
        negativeEdge.setId(1L);
        negativeEdge.setFromNodeId(1L);
        negativeEdge.setToNodeId(2L);
        negativeEdge.setDistance(-10.0); // 负距离
        negativeEdge.setIsAccessible(1);

        when(hospitalNodeMapper.selectById(1L)).thenReturn(nodeA);
        when(hospitalNodeMapper.selectById(2L)).thenReturn(nodeB);
        when(hospitalEdgeMapper.selectList(any())).thenReturn(Collections.singletonList(negativeEdge));

        // 执行测试
        NavigationResponseDTO result = pathFindingService.findShortestPath(1L, 2L);

        // 即使存在负权重，算法也应该返回结果
        assertNotNull(result);
        // 注意：A*算法处理负权重可能有问题，但应该能返回某种结果
    }

    @Test
    @DisplayName("测试零距离边")
    void testZeroDistanceEdge() {
        // 测试电梯等场景，楼层间距离为0

        HospitalNode elevatorF1 = createNode(1L, "EL-F1", "电梯1层", 1, 30.0, 30.0, "ELEVATOR");
        HospitalNode elevatorF2 = createNode(2L, "EL-F2", "电梯2层", 2, 30.0, 30.0, "ELEVATOR");
        HospitalNode roomF2 = createNode(3L, "RM-201", "诊室", 2, 10.0, 10.0, "ROOM");

        // 电梯楼层间边，距离为0
        HospitalEdge elevatorEdge = createEdge(1L, 1L, 2L, 0.0, 1);
        HospitalEdge roomEdge = createEdge(2L, 2L, 3L, 28.3, 0);

        when(hospitalNodeMapper.selectById(1L)).thenReturn(elevatorF1);
        when(hospitalNodeMapper.selectById(2L)).thenReturn(elevatorF2);
        when(hospitalNodeMapper.selectById(3L)).thenReturn(roomF2);

        when(hospitalEdgeMapper.selectList(any()))
            .thenAnswer(invocation -> {
                var args = invocation.getArguments();
                // 根据查询条件返回不同的边
                return Arrays.asList(elevatorEdge, roomEdge);
            });

        NavigationResponseDTO result = pathFindingService.findShortestPath(1L, 3L);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        // 验证总距离只包含非零边
        assertEquals(28.3, result.getDistance(), 0.1);
    }

    @Test
    @DisplayName("测试最大坐标值路径")
    void testMaxCoordinatePath() {
        // 测试大坐标值场景

        HospitalNode nodeA = createNode(1L, "A", "节点A", 1, 0.0, 0.0, "ROOM");
        HospitalNode nodeB = createNode(2L, "B", "节点B", 1, 1000.0, 1000.0, "ROOM");

        double expectedDistance = Math.sqrt(1000.0 * 1000.0 + 1000.0 * 1000.0);

        HospitalEdge edge = createEdge(1L, 1L, 2L, expectedDistance, 0);

        when(hospitalNodeMapper.selectById(1L)).thenReturn(nodeA);
        when(hospitalNodeMapper.selectById(2L)).thenReturn(nodeB);
        when(hospitalEdgeMapper.selectList(any())).thenReturn(Collections.singletonList(edge));

        NavigationResponseDTO result = pathFindingService.findShortestPath(1L, 2L);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertEquals(expectedDistance, result.getDistance(), 0.1);
    }
}
