package com.hospital.arnavigation.controller;

import com.hospital.arnavigation.common.Result;
import com.hospital.arnavigation.dto.NavigationRequestDTO;
import com.hospital.arnavigation.dto.NavigationResponseDTO;
import com.hospital.arnavigation.dto.PathNodeDTO;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.service.PathFindingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/navigation")
@RequiredArgsConstructor
@Tag(name = "导航管理", description = "医院 AR 实景导航系统接口")
@CrossOrigin(origins = "*")
public class NavigationController {

    private final PathFindingService pathFindingService;
    private final HospitalNodeMapper hospitalNodeMapper;

    @PostMapping("/plan")
    @Operation(summary = "路径规划", description = "根据起点和终点 ID 规划最短路径")
    public ResponseEntity<Result<NavigationResponseDTO>> planNavigation(
            @Valid @RequestBody NavigationRequestDTO request) {

        log.info("收到路径规划请求: 起点={}, 终点={}", request.getStartNodeId(), request.getEndNodeId());

        NavigationResponseDTO response = pathFindingService.findShortestPath(
                request.getStartNodeId(),
                request.getEndNodeId()
        );

        if ("SUCCESS".equals(response.getStatus())) {
            return ResponseEntity.ok(Result.success(response, "路径规划成功"));
        }

        return ResponseEntity.badRequest()
                .body(Result.error(400, response.getErrorMessage()));
    }

    @GetMapping("/node/code/{nodeCode}")
    @Operation(summary = "根据节点编码获取节点信息", description = "通过二维码中的 nodeCode 获取节点详细信息")
    public ResponseEntity<Result<List<HospitalNode>>> getNodeByCode(@PathVariable String nodeCode) {
        log.info("根据节点编码查询节点: nodeCode={}", nodeCode);

        if (nodeCode == null || nodeCode.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Result.badRequest("节点编码不能为空"));
        }

        List<HospitalNode> nodes = hospitalNodeMapper.selectByNodeCode(nodeCode);
        if (nodes == null || nodes.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Result.notFound("未找到节点编码为 " + nodeCode + " 的节点"));
        }

        return ResponseEntity.ok(Result.success(nodes, "查询成功"));
    }

    @GetMapping("/node/{nodeId}/neighbors")
    @Operation(summary = "获取相邻节点", description = "获取指定节点的所有相邻节点")
    public ResponseEntity<Result<List<PathNodeDTO>>> getNeighbors(@PathVariable Long nodeId) {
        log.info("获取相邻节点: nodeId={}", nodeId);

        if (nodeId == null || nodeId <= 0) {
            return ResponseEntity.badRequest()
                    .body(Result.badRequest("节点 ID 无效"));
        }

        List<PathNodeDTO> neighbors = pathFindingService.getNeighbors(nodeId);
        return ResponseEntity.ok(Result.success(neighbors, "查询成功"));
    }

    @GetMapping("/path")
    @Operation(summary = "路径规划（GET）", description = "根据起点和终点 ID 规划最短路径，兼容 GET 方式")
    public ResponseEntity<Result<NavigationResponseDTO>> getNavigationPath(
            @RequestParam Long fromId,
            @RequestParam Long toId) {

        log.info("收到路径规划请求(GET): 起点={}, 终点={}", fromId, toId);

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

        return ResponseEntity.badRequest()
                .body(Result.error(400, response.getErrorMessage()));
    }

    @GetMapping("/health")
    @Operation(summary = "健康检查", description = "服务健康检查")
    public ResponseEntity<Result<Map<String, Object>>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "Hospital AR Navigation System");
        health.put("version", "1.0.0");
        health.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(Result.success(health, "服务运行正常"));
    }

    @GetMapping("/nodes")
    @Operation(summary = "获取节点列表", description = "获取所有医院节点")
    public ResponseEntity<Result<List<HospitalNode>>> getAllNodes() {
        List<HospitalNode> nodes = hospitalNodeMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<HospitalNode>()
                        .eq(HospitalNode::getIsActive, 1)
                        .orderByAsc(HospitalNode::getFloor)
                        .orderByAsc(HospitalNode::getId)
        );
        return ResponseEntity.ok(Result.success(nodes, "查询成功"));
    }

    @PostMapping("/node")
    @Operation(summary = "创建节点", description = "创建新的医院节点")
    public ResponseEntity<Result<HospitalNode>> createNode(@RequestBody HospitalNode node) {
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
            return ResponseEntity.badRequest()
                    .body(Result.badRequest("节点编码或名称已存在"));
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
            return ResponseEntity.status(404)
                    .body(Result.notFound("节点不存在"));
        }

        node.setIsActive(0);
        hospitalNodeMapper.updateById(node);
        return ResponseEntity.ok(Result.success(null, "删除成功"));
    }

    @GetMapping("/nodeTypes")
    @Operation(summary = "获取节点类型", description = "获取所有节点类型")
    public ResponseEntity<Result<Map<String, String>>> getNodeTypes() {
        Map<String, String> types = new LinkedHashMap<>();
        types.put("ENTRANCE", "入口");
        types.put("NORMAL", "普通节点");
        types.put("ROOM", "诊室/病房");
        types.put("ELEVATOR", "电梯");
        types.put("STAIRS", "楼梯");
        types.put("RESTROOM", "洗手间");
        types.put("PHARMACY", "药房");
        types.put("REGISTRATION", "挂号大厅");
        types.put("CLINIC", "诊室");
        types.put("EXAMINATION", "检查室");
        types.put("NURSE_STATION", "护士站");
        return ResponseEntity.ok(Result.success(types, "查询成功"));
    }
}
