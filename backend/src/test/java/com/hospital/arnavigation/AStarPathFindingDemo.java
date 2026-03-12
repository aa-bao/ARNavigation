package com.hospital.arnavigation;

import java.util.*;

/**
 * A*算法Demo - 用于验证Mock路网的连通性
 * 独立运行的测试程序，不需要Spring Boot环境
 */
public class AStarPathFindingDemo {

    static class Node {
        Long id;
        String name;
        double x, y;
        int floor;

        Node(Long id, String name, double x, double y, int floor) {
            this.id = id;
            this.name = name;
            this.x = x;
            this.y = y;
            this.floor = floor;
        }
    }

    static class Edge {
        Long fromId;
        Long toId;
        double distance;
        double angle;

        Edge(Long fromId, Long toId, double distance, double angle) {
            this.fromId = fromId;
            this.toId = toId;
            this.distance = distance;
            this.angle = angle;
        }
    }

    static class AStarNode {
        Node node;
        double g;
        double h;
        double f;
        AStarNode parent;
        Edge edgeFromParent;

        AStarNode(Node node, double g, double h, AStarNode parent, Edge edgeFromParent) {
            this.node = node;
            this.g = g;
            this.h = h;
            this.f = g + h;
            this.parent = parent;
            this.edgeFromParent = edgeFromParent;
        }
    }

    private static Map<Long, Node> nodes = new HashMap<>();
    private static Map<Long, List<Edge>> edges = new HashMap<>();

    public static void main(String[] args) {
        System.out.println("========================================");
        System.out.println("   医院AR导航系统 - A*算法Demo测试");
        System.out.println("========================================\n");

        initMockData();

        testPath(1L, 8L, "从正门入口到药房");
        testPath(1L, 7L, "从正门入口到二楼外科诊室");
        testPath(4L, 5L, "从内科诊室到洗手间");
        testPath(7L, 8L, "从二楼外科诊室到一楼药房");

        System.out.println("\n========================================");
        System.out.println("           Demo测试完成！");
        System.out.println("========================================");
    }

    private static void initMockData() {
        nodes.put(1L, new Node(1L, "医院正门入口", 0.0, 0.0, 1));
        nodes.put(2L, new Node(2L, "一楼大厅", 5.0, 0.0, 1));
        nodes.put(3L, new Node(3L, "一号电梯", 10.0, 0.0, 1));
        nodes.put(4L, new Node(4L, "内科诊室", 5.0, 5.0, 1));
        nodes.put(5L, new Node(5L, "洗手间", 8.0, 3.0, 1));
        nodes.put(6L, new Node(6L, "二楼电梯口", 10.0, 0.0, 2));
        nodes.put(7L, new Node(7L, "外科诊室", 5.0, 5.0, 2));
        nodes.put(8L, new Node(8L, "药房", 12.0, 2.0, 1));

        addEdge(1L, 2L, 5.0, 0.0);
        addEdge(2L, 1L, 5.0, 180.0);
        addEdge(2L, 3L, 5.0, 0.0);
        addEdge(3L, 2L, 5.0, 180.0);
        addEdge(2L, 4L, 5.0, 90.0);
        addEdge(4L, 2L, 5.0, 270.0);
        addEdge(2L, 5L, 4.24, 45.0);
        addEdge(5L, 2L, 4.24, 225.0);
        addEdge(3L, 6L, 0.0, 0.0);
        addEdge(6L, 3L, 0.0, 0.0);
        addEdge(6L, 7L, 7.07, 135.0);
        addEdge(7L, 6L, 7.07, 315.0);
        addEdge(3L, 8L, 2.83, 45.0);
        addEdge(8L, 3L, 2.83, 225.0);

        System.out.println("Mock数据初始化完成:");
        System.out.println("- 节点数量: " + nodes.size());
        System.out.println("- 边数量: " + edges.values().stream().mapToInt(List::size).sum() / 2 + "\n");
    }

    private static void addEdge(Long fromId, Long toId, double distance, double angle) {
        edges.computeIfAbsent(fromId, k -> new ArrayList<>()).add(new Edge(fromId, toId, distance, angle));
    }

    private static void testPath(Long startId, Long endId, String description) {
        System.out.println("----------------------------------------");
        System.out.println("测试: " + description);
        System.out.println("起点: " + nodes.get(startId).name + " (ID=" + startId + ")");
        System.out.println("终点: " + nodes.get(endId).name + " (ID=" + endId + ")");
        System.out.println("----------------------------------------");

        List<Node> path = findPath(startId, endId);

        if (path != null) {
            System.out.println("✓ 找到路径!");
            System.out.print("路径: ");
            double totalDistance = 0;
            for (int i = 0; i < path.size(); i++) {
                Node node = path.get(i);
                System.out.print(node.name);
                if (i < path.size() - 1) {
                    System.out.print(" → ");
                }
            }
            System.out.println();

            totalDistance = calculatePathDistance(path);
            System.out.println(String.format("总距离: %.2f 米", totalDistance));
            System.out.println(String.format("预计时间: %d 秒\n", (int)(totalDistance / 1.5)));
        } else {
            System.out.println("✗ 未找到路径!\n");
        }
    }

    private static List<Node> findPath(Long startId, Long endId) {
        Node startNode = nodes.get(startId);
        Node endNode = nodes.get(endId);

        PriorityQueue<AStarNode> openSet = new PriorityQueue<>(Comparator.comparingDouble(n -> n.f));
        Set<Long> closedSet = new HashSet<>();
        Map<Long, Double> gScore = new HashMap<>();

        AStarNode start = new AStarNode(startNode, 0, calculateHeuristic(startNode, endNode), null, null);
        openSet.add(start);
        gScore.put(startId, 0.0);

        while (!openSet.isEmpty()) {
            AStarNode current = openSet.poll();

            if (current.node.id.equals(endId)) {
                return reconstructPath(current);
            }

            closedSet.add(current.node.id);

            List<Edge> neighborEdges = edges.getOrDefault(current.node.id, Collections.emptyList());
            for (Edge edge : neighborEdges) {
                Node neighbor = nodes.get(edge.toId);
                if (closedSet.contains(neighbor.id)) {
                    continue;
                }

                double tentativeG = current.g + edge.distance;

                if (!gScore.containsKey(neighbor.id) || tentativeG < gScore.get(neighbor.id)) {
                    gScore.put(neighbor.id, tentativeG);
                    double h = calculateHeuristic(neighbor, endNode);
                    openSet.add(new AStarNode(neighbor, tentativeG, h, current, edge));
                }
            }
        }

        return null;
    }

    private static double calculateHeuristic(Node node1, Node node2) {
        double floorPenalty = Math.abs(node1.floor - node2.floor) * 20;
        double dx = node1.x - node2.x;
        double dy = node1.y - node2.y;
        return Math.sqrt(dx * dx + dy * dy) + floorPenalty;
    }

    private static List<Node> reconstructPath(AStarNode endNode) {
        List<Node> path = new ArrayList<>();
        AStarNode current = endNode;
        while (current != null) {
            path.add(0, current.node);
            current = current.parent;
        }
        return path;
    }

    private static double calculatePathDistance(List<Node> path) {
        double total = 0;
        for (int i = 0; i < path.size() - 1; i++) {
            Node n1 = path.get(i);
            Node n2 = path.get(i + 1);
            for (Edge edge : edges.get(n1.id)) {
                if (edge.toId.equals(n2.id)) {
                    total += edge.distance;
                    break;
                }
            }
        }
        return total;
    }
}
