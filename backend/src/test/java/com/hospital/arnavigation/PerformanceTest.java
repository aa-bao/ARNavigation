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

import java.util.*;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * 性能测试类
 * 测试A*算法在不同规模路网下的性能表现
 */
public class PerformanceTest {

    @Mock
    private HospitalNodeMapper hospitalNodeMapper;

    @Mock
    private HospitalEdgeMapper hospitalEdgeMapper;

    @InjectMocks
    private AStarPathFindingServiceImpl pathFindingService;

    // 性能测试结果记录
    private List<PerformanceResult> performanceResults = new ArrayList<>();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        performanceResults.clear();
    }

    /**
     * 性能测试结果类
     */
    private static class PerformanceResult {
        String testName;
        int nodeCount;
        int edgeCount;
        long executionTimeMs;
        long avgTimePerQueryMs;
        boolean success;

        PerformanceResult(String testName, int nodeCount, int edgeCount,
                         long executionTimeMs, long avgTimePerQueryMs, boolean success) {
            this.testName = testName;
            this.nodeCount = nodeCount;
            this.edgeCount = edgeCount;
            this.executionTimeMs = executionTimeMs;
            this.avgTimePerQueryMs = avgTimePerQueryMs;
            this.success = success;
        }

        @Override
        public String toString() {
            return String.format(
                "| %-20s | %6d | %6d | %10d ms | %10d ms | %-6s |",
                testName, nodeCount, edgeCount, executionTimeMs, avgTimePerQueryMs,
                success ? "PASS" : "FAIL"
            );
        }
    }

    /**
     * 创建网格状路网
     * @param size 网格大小 (size x size)
     * @return 节点ID到HospitalNode的映射
     */
    private Map<Long, HospitalNode> createGridNetwork(int size) {
        Map<Long, HospitalNode> nodes = new HashMap<>();
        List<HospitalEdge> edges = new ArrayList<>();

        // 创建节点
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                long nodeId = i * size + j + 1;
                HospitalNode node = new HospitalNode();
                node.setId(nodeId);
                node.setNodeCode("NODE-" + nodeId);
                node.setNodeName("节点" + nodeId);
                node.setFloor(1);
                node.setXCoordinate((double) (i * 10));
                node.setYCoordinate((double) (j * 10));
                node.setNodeType("ROOM");
                nodes.put(nodeId, node);
            }
        }

        // 创建边（网格连接）
        long edgeId = 1;
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                long nodeId = i * size + j + 1;

                // 向右连接
                if (j < size - 1) {
                    HospitalEdge edge = new HospitalEdge();
                    edge.setId(edgeId++);
                    edge.setFromNodeId(nodeId);
                    edge.setToNodeId(nodeId + 1);
                    edge.setDistance(10.0);
                    edge.setIsAccessible(1);
                    edges.add(edge);
                }

                // 向下连接
                if (i < size - 1) {
                    HospitalEdge edge = new HospitalEdge();
                    edge.setId(edgeId++);
                    edge.setFromNodeId(nodeId);
                    edge.setToNodeId(nodeId + size);
                    edge.setDistance(10.0);
                    edge.setIsAccessible(1);
                    edges.add(edge);
                }
            }
        }

        // 配置Mock
        for (Map.Entry<Long, HospitalNode> entry : nodes.entrySet()) {
            when(hospitalNodeMapper.selectById(entry.getKey())).thenReturn(entry.getValue());
        }

        when(hospitalEdgeMapper.selectList(any())).thenAnswer(invocation -> {
            // 这里简化处理，返回所有边
            return edges;
        });

        return nodes;
    }

    @Test
    @DisplayName("测试100个节点的路网查询时间")
    void test100NodesNetwork() {
        runPerformanceTest("100节点网络", 10, 10, 10);
    }

    @Test
    @DisplayName("测试500个节点的路网查询时间")
    void test500NodesNetwork() {
        runPerformanceTest("500节点网络", 22, 22, 5); // 约500节点
    }

    @Test
    @DisplayName("测试1000个节点的路网查询时间")
    void test1000NodesNetwork() {
        runPerformanceTest("1000节点网络", 31, 31, 3); // 约1000节点
    }

    /**
     * 运行性能测试
     * @param testName 测试名称
     * @param gridSize 网格大小
     * @param queryCount 查询次数
     */
    private void runPerformanceTest(String testName, int gridSize, int queryCount, int expectedMaxTimeMs) {
        System.out.println("\n========================================");
        System.out.println("开始性能测试: " + testName);
        System.out.println("========================================");

        // 创建路网
        long startTime = System.nanoTime();
        Map<Long, HospitalNode> nodes = createGridNetwork(gridSize);
        long setupTime = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime);

        int nodeCount = nodes.size();
        int edgeCount = (gridSize - 1) * gridSize * 2; // 近似计算

        System.out.println("路网规模: " + nodeCount + " 节点, " + edgeCount + " 条边");
        System.out.println("路网初始化时间: " + setupTime + " ms");

        // 执行多次查询
        long totalQueryTime = 0;
        long minQueryTime = Long.MAX_VALUE;
        long maxQueryTime = 0;
        int successCount = 0;

        Long[] nodeIds = nodes.keySet().toArray(new Long[0]);

        for (int i = 0; i < queryCount; i++) {
            // 随机选择起点和终点
            long startId = nodeIds[(int) (Math.random() * nodeIds.length)];
            long endId = nodeIds[(int) (Math.random() * nodeIds.length)];

            long queryStartTime = System.nanoTime();
            NavigationResponseDTO result = pathFindingService.findShortestPath(startId, endId);
            long queryTime = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - queryStartTime);

            totalQueryTime += queryTime;
            minQueryTime = Math.min(minQueryTime, queryTime);
            maxQueryTime = Math.max(maxQueryTime, queryTime);

            if ("SUCCESS".equals(result.getStatus())) {
                successCount++;
            }
        }

        long avgQueryTime = totalQueryTime / queryCount;

        System.out.println("\n查询统计:");
        System.out.println("  总查询次数: " + queryCount);
        System.out.println("  成功次数: " + successCount);
        System.out.println("  成功率: " + (successCount * 100 / queryCount) + "%");
        System.out.println("  总查询时间: " + totalQueryTime + " ms");
        System.out.println("  平均查询时间: " + avgQueryTime + " ms");
        System.out.println("  最短查询时间: " + (minQueryTime == Long.MAX_VALUE ? 0 : minQueryTime) + " ms");
        System.out.println("  最长查询时间: " + maxQueryTime + " ms");

        // 记录结果
        boolean pass = avgQueryTime <= expectedMaxTimeMs;
        PerformanceResult result = new PerformanceResult(
            testName,
            nodeCount,
            edgeCount,
            totalQueryTime,
            avgQueryTime,
            pass
        );
        performanceResults.add(result);

        System.out.println("\n========================================");
        System.out.println("性能测试" + (pass ? "通过" : "未通过") + ": " + testName);
        System.out.println("预期最大时间: " + expectedMaxTimeMs + " ms, 实际平均时间: " + avgQueryTime + " ms");
        System.out.println("========================================\n");

        // 断言性能满足要求
        assertTrue(avgQueryTime <= expectedMaxTimeMs,
            "平均查询时间 " + avgQueryTime + "ms 超过了预期最大时间 " + expectedMaxTimeMs + "ms");
    }

    @Test
    @DisplayName("打印性能测试汇总报告")
    void printPerformanceSummary() {
        System.out.println("\n");
        System.out.println("╔══════════════════════════════════════════════════════════════════════════════╗");
        System.out.println("║                    性能测试汇总报告                                          ║");
        System.out.println("╠══════════════════════════════════════════════════════════════════════════════╣");
        System.out.println("║ 测试名称               │ 节点数 │ 边数   │ 总时间     │ 平均时间   │ 结果 ║");
        System.out.println("╠══════════════════════════════════════════════════════════════════════════════╣");

        for (PerformanceResult result : performanceResults) {
            System.out.println("║ " + String.format("%-22s", result.testName) + " │ " +
                String.format("%6d", result.nodeCount) + " │ " +
                String.format("%6d", result.edgeCount) + " │ " +
                String.format("%8d ms", result.executionTimeMs) + " │ " +
                String.format("%8d ms", result.avgTimePerQueryMs) + " │ " +
                (result.success ? "PASS " : "FAIL ") + "║");
        }

        System.out.println("╚══════════════════════════════════════════════════════════════════════════════╝");

        // 计算通过率
        long passCount = performanceResults.stream().filter(r -> r.success).count();
        double passRate = performanceResults.isEmpty() ? 0 :
            (double) passCount / performanceResults.size() * 100;

        System.out.println("\n测试统计:");
        System.out.println("  总测试数: " + performanceResults.size());
        System.out.println("  通过数: " + passCount);
        System.out.println("  失败数: " + (performanceResults.size() - passCount));
        System.out.println("  通过率: " + String.format("%.2f%%", passRate));
    }
}
