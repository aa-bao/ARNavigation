package com.hospital.arnavigation.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hospital.arnavigation.common.Result;
import com.hospital.arnavigation.dto.NavigationDestinationDTO;
import com.hospital.arnavigation.dto.NavigationNodeDTO;
import com.hospital.arnavigation.dto.NavigationRequestDTO;
import com.hospital.arnavigation.dto.NavigationResponseDTO;
import com.hospital.arnavigation.dto.NavigationSegmentRequestDTO;
import com.hospital.arnavigation.dto.NavigationSegmentResponseDTO;
import com.hospital.arnavigation.dto.PathNodeDTO;
import com.hospital.arnavigation.dto.RecentNavigationDTO;
import com.hospital.arnavigation.dto.RecentNavigationRequestDTO;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.entity.HospitalEdge;
import com.hospital.arnavigation.mapper.HospitalEdgeMapper;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.service.NavigationDestinationService;
import com.hospital.arnavigation.service.NavigationSegmentService;
import com.hospital.arnavigation.service.PathFindingService;
import com.hospital.arnavigation.service.RecentNavigationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/navigation")
@RequiredArgsConstructor
@Tag(name = "导航管理", description = "医院 AR 导航接口")
@CrossOrigin(origins = "*")
public class NavigationController {

    private final PathFindingService pathFindingService;
    private final NavigationSegmentService navigationSegmentService;
    private final NavigationDestinationService navigationDestinationService;
    private final RecentNavigationService recentNavigationService;
    private final HospitalNodeMapper hospitalNodeMapper;
    private final HospitalEdgeMapper hospitalEdgeMapper;

    @PostMapping("/plan")
    @Operation(summary = "路径规划", description = "根据起点和终点 ID 规划最短路径")
    public ResponseEntity<Result<NavigationResponseDTO>> planNavigation(@Valid @RequestBody NavigationRequestDTO request) {
        log.info("收到路径规划请求: startNodeId={}, endNodeId={}", request.getStartNodeId(), request.getEndNodeId());

        NavigationResponseDTO response = pathFindingService.findShortestPath(
                request.getStartNodeId(),
                request.getEndNodeId()
        );

        if ("SUCCESS".equals(response.getStatus())) {
            return ResponseEntity.ok(Result.success(response, "路径规划成功"));
        }

        return ResponseEntity.badRequest().body(Result.error(400, response.getErrorMessage()));
    }

    @GetMapping("/node/code/{nodeCode}")
    @Operation(summary = "按节点编码查询", description = "通过二维码中的 nodeCode 返回标准化节点信息")
    public ResponseEntity<Result<NavigationNodeDTO>> getNodeByCode(@PathVariable String nodeCode) {
        log.info("按节点编码查询节点: nodeCode={}", nodeCode);

        if (nodeCode == null || nodeCode.isBlank()) {
            return ResponseEntity.badRequest().body(Result.badRequest("节点编码不能为空"));
        }

        NavigationNodeDTO node = navigationSegmentService.findNormalizedNodeByCode(nodeCode);
        if (node == null) {
            return ResponseEntity.status(404)
                    .body(Result.notFound("未找到节点编码为 " + nodeCode + " 的节点"));
        }

        return ResponseEntity.ok(Result.success(node, "查询成功"));
    }

    @PostMapping("/segment")
    @Operation(summary = "单段导航", description = "根据扫码起点和目标节点 ID 规划下一段导航")
    public ResponseEntity<Result<NavigationSegmentResponseDTO>> buildSegment(
            @Valid @RequestBody NavigationSegmentRequestDTO request) {

        NavigationSegmentResponseDTO response = navigationSegmentService.buildSegment(
                request.getStartCode(),
                request.getTargetId()
        );

        if ("SUCCESS".equals(response.getStatus())) {
            return ResponseEntity.ok(Result.success(response, "单段导航规划成功"));
        }

        return ResponseEntity.badRequest().body(Result.error(400, response.getErrorMessage()));
    }

    @GetMapping("/node/{nodeId}/neighbors")
    @Operation(summary = "查询相邻节点", description = "返回指定节点的所有相邻节点")
    public ResponseEntity<Result<List<PathNodeDTO>>> getNeighbors(@PathVariable Long nodeId) {
        log.info("查询相邻节点: nodeId={}", nodeId);

        if (nodeId == null || nodeId <= 0) {
            return ResponseEntity.badRequest().body(Result.badRequest("节点 ID 无效"));
        }

        List<PathNodeDTO> neighbors = pathFindingService.getNeighbors(nodeId);
        return ResponseEntity.ok(Result.success(neighbors, "查询成功"));
    }

    @GetMapping("/path")
    @Operation(summary = "GET 路径规划", description = "兼容 GET 方式的最短路径规划")
    public ResponseEntity<Result<NavigationResponseDTO>> getNavigationPath(
            @RequestParam Long fromId,
            @RequestParam Long toId) {

        log.info("收到路径规划请求(GET): fromId={}, toId={}", fromId, toId);

        NavigationRequestDTO request = new NavigationRequestDTO();
        request.setStartNodeId(fromId);
        request.setEndNodeId(toId);

        NavigationResponseDTO response = pathFindingService.findShortestPath(
                request.getStartNodeId(),
                request.getEndNodeId()
        );

        if ("SUCCESS".equals(response.getStatus())) {
            return ResponseEntity.ok(Result.success(response, "路径规划成功"));
        }

        return ResponseEntity.badRequest().body(Result.error(400, response.getErrorMessage()));
    }

    @GetMapping("/health")
    @Operation(summary = "健康检查", description = "导航服务健康检查")
    public ResponseEntity<Result<Map<String, Object>>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "Hospital AR Navigation System");
        health.put("version", "1.0.0");
        health.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(Result.success(health, "服务运行正常"));
    }

    @GetMapping("/nodes")
    @Operation(summary = "查询节点列表", description = "返回所有启用节点")
    public ResponseEntity<Result<List<HospitalNode>>> getAllNodes() {
        List<HospitalNode> nodes = hospitalNodeMapper.selectList(
                new LambdaQueryWrapper<HospitalNode>()
                        .eq(HospitalNode::getIsActive, 1)
                        .orderByAsc(HospitalNode::getFloor)
                        .orderByAsc(HospitalNode::getId)
        );
        return ResponseEntity.ok(Result.success(nodes, "查询成功"));
    }

    @GetMapping("/edges")
    @Operation(summary = "查询边列表", description = "返回可用于地图预览的可达边数据，可按楼层筛选")
    public ResponseEntity<Result<List<HospitalEdge>>> getEdges(@RequestParam(required = false) Integer floor) {
        List<HospitalEdge> edges = hospitalEdgeMapper.selectList(null);

        if (floor == null) {
            return ResponseEntity.ok(Result.success(edges, "查询成功"));
        }

        Map<Long, HospitalNode> nodeMap = hospitalNodeMapper.selectList(
                new LambdaQueryWrapper<HospitalNode>()
                        .eq(HospitalNode::getIsActive, 1)
        ).stream().collect(java.util.stream.Collectors.toMap(HospitalNode::getId, node -> node));

        List<HospitalEdge> filteredEdges = edges.stream()
                .filter(edge -> {
                    HospitalNode fromNode = nodeMap.get(edge.getFromNodeId());
                    HospitalNode toNode = nodeMap.get(edge.getToNodeId());
                    if (fromNode == null || toNode == null) {
                        return false;
                    }
                    return Integer.valueOf(floor).equals(fromNode.getFloor())
                            && Integer.valueOf(floor).equals(toNode.getFloor())
                            && Integer.valueOf(1).equals(fromNode.getIsActive())
                            && Integer.valueOf(1).equals(toNode.getIsActive())
                            && (edge.getIsAccessible() == null || Integer.valueOf(1).equals(edge.getIsAccessible()));
                })
                .toList();

        return ResponseEntity.ok(Result.success(filteredEdges, "查询成功"));
    }

    @GetMapping("/destinations")
    @Operation(summary = "查询目的地列表", description = "返回可作为目的地的节点，支持楼层、分类和推荐筛选")
    public ResponseEntity<Result<List<NavigationDestinationDTO>>> getDestinations(
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean recommended) {

        List<NavigationDestinationDTO> destinations =
                navigationDestinationService.findDestinations(floor, category, recommended);
        return ResponseEntity.ok(Result.success(destinations, "查询成功"));
    }

    @PostMapping("/recent")
    @Operation(summary = "保存最近导航", description = "按用户维度保存最近一次选择的目的地")
    public ResponseEntity<Result<RecentNavigationDTO>> saveRecentNavigation(
            @Valid @RequestBody RecentNavigationRequestDTO request) {

        if (request.getUserId() == null || request.getUserId() <= 0) {
            return ResponseEntity.badRequest().body(Result.badRequest("用户 ID 无效"));
        }
        if (request.getNodeId() == null || request.getNodeId() <= 0) {
            return ResponseEntity.badRequest().body(Result.badRequest("节点 ID 无效"));
        }

        RecentNavigationDTO saved;
        try {
            saved = recentNavigationService.saveRecentNavigation(
                    request.getUserId(),
                    request.getNodeId()
            );
        } catch (Exception exception) {
            log.error("保存最近导航失败: userId={}, nodeId={}", request.getUserId(), request.getNodeId(), exception);
            return ResponseEntity.internalServerError()
                    .body(Result.error(500, "最近导航保存失败，请确认相关数据与 user_recent_nav 表已初始化"));
        }

        if (saved == null) {
            return ResponseEntity.status(404).body(Result.notFound("未找到用户或节点"));
        }

        return ResponseEntity.ok(Result.success(saved, "保存成功"));
    }

    @GetMapping("/recent/{userId}")
    @Operation(summary = "查询最近到访目的地", description = "返回指定用户最近到访的目的地列表")
    public ResponseEntity<Result<List<RecentNavigationDTO>>> getRecentNavigation(
            @PathVariable Long userId,
            @RequestParam(required = false) Integer limit) {
        if (userId == null || userId <= 0) {
            return ResponseEntity.badRequest().body(Result.badRequest("用户 ID 无效"));
        }

        List<RecentNavigationDTO> recentNavigation = recentNavigationService.getRecentNavigations(userId, limit);
        if (recentNavigation == null || recentNavigation.isEmpty()) {
            return ResponseEntity.status(404).body(Result.notFound("未找到最近导航记录"));
        }

        return ResponseEntity.ok(Result.success(recentNavigation, "查询成功"));
    }

    @PostMapping("/node")
    @Operation(summary = "创建节点", description = "创建新的医院节点")
    public ResponseEntity<Result<HospitalNode>> createNode(@RequestBody HospitalNode node) {
        if (node.getNodeCode() == null || node.getNodeCode().isBlank()) {
            return ResponseEntity.badRequest().body(Result.badRequest("节点编码不能为空"));
        }

        List<HospitalNode> existingByCode = hospitalNodeMapper.selectByNodeCode(node.getNodeCode());
        if (existingByCode != null && !existingByCode.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Result.badRequest("节点编码 " + node.getNodeCode() + " 已存在"));
        }

        List<HospitalNode> existingByName = hospitalNodeMapper.selectByNodeName(node.getNodeName());
        if (existingByName != null && !existingByName.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Result.badRequest("节点名称 " + node.getNodeName() + " 已存在"));
        }

        try {
            hospitalNodeMapper.insert(node);
            return ResponseEntity.ok(Result.success(node, "创建成功"));
        } catch (DuplicateKeyException e) {
            log.warn("创建节点时发生唯一约束冲突: code={}, name={}", node.getNodeCode(), node.getNodeName(), e);
            return ResponseEntity.badRequest().body(Result.badRequest("节点编码或名称已存在"));
        }
    }

    @PutMapping("/node/{id}")
    @Operation(summary = "更新节点", description = "更新医院节点信息")
    public ResponseEntity<Result<HospitalNode>> updateNode(@PathVariable Long id, @RequestBody HospitalNode node) {
        node.setId(id);
        hospitalNodeMapper.updateById(node);
        HospitalNode updated = hospitalNodeMapper.selectById(id);
        return ResponseEntity.ok(Result.success(updated, "更新成功"));
    }

    @DeleteMapping("/node/{id}")
    @Operation(summary = "删除节点", description = "软删除医院节点")
    public ResponseEntity<Result<Void>> deleteNode(@PathVariable Long id) {
        HospitalNode node = hospitalNodeMapper.selectById(id);
        if (node == null) {
            return ResponseEntity.status(404).body(Result.notFound("节点不存在"));
        }

        node.setIsActive(0);
        hospitalNodeMapper.updateById(node);
        return ResponseEntity.ok(Result.success(null, "删除成功"));
    }

    @GetMapping("/nodeTypes")
    @Operation(summary = "查询节点类型", description = "返回所有支持的节点类型")
    public ResponseEntity<Result<Map<String, String>>> getNodeTypes() {
        Map<String, String> types = new LinkedHashMap<>();
        types.put("ENTRANCE", "入口");
        types.put("NORMAL", "普通节点");
        types.put("ROOM", "诊室/病房");
        types.put("ELEVATOR", "电梯");
        types.put("STAIRS", "楼梯");
        types.put("RESTROOM", "卫生间");
        types.put("PHARMACY", "药房");
        types.put("REGISTRATION", "挂号大厅");
        types.put("CLINIC", "诊室");
        types.put("EXAMINATION", "检查室");
        types.put("NURSE_STATION", "护士站");
        return ResponseEntity.ok(Result.success(types, "查询成功"));
    }
}
