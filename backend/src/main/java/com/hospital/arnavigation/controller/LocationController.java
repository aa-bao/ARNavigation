package com.hospital.arnavigation.controller;

import com.hospital.arnavigation.common.Result;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 位置控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/location")
@RequiredArgsConstructor
@Tag(name = "位置管理", description = "医院位置查询接口")
@CrossOrigin(origins = "*")
public class LocationController {

    private final HospitalNodeMapper hospitalNodeMapper;

    /**
     * 获取所有位置列表（分页）
     */
    @GetMapping("/list")
    @Operation(summary = "获取位置列表", description = "获取所有位置列表，支持分页")
    public ResponseEntity<Result<List<HospitalNode>>> getLocationList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "100") Integer pageSize) {
        log.info("获取位置列表: page={}, pageSize={}", page, pageSize);

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<HospitalNode> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        wrapper.eq(HospitalNode::getIsActive, 1)
               .orderByAsc(HospitalNode::getFloor)
               .orderByAsc(HospitalNode::getId);

        // 分页查询
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<HospitalNode> pg =
                new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(page, pageSize);
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<HospitalNode> result =
                hospitalNodeMapper.selectPage(pg, wrapper);

        log.info("查询结果数量: {}", result.getTotal());
        return ResponseEntity.ok(Result.success(result.getRecords(), "查询成功"));
    }

    /**
     * 根据节点编号或ID获取位置详情
     */
    @GetMapping("/{nodeCode}")
    @Operation(summary = "获取位置详情", description = "根据节点编号或ID获取位置详细信息")
    public ResponseEntity<Result<HospitalNode>> getLocationByCode(@PathVariable String nodeCode) {
        log.info("获取位置详情: nodeCode={}", nodeCode);

        if (nodeCode == null || nodeCode.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Result.badRequest("节点编号不能为空"));
        }

        // 先尝试通过 nodeCode 查询
        List<HospitalNode> nodes = hospitalNodeMapper.selectByNodeCode(nodeCode);
        if (nodes != null && !nodes.isEmpty()) {
            return ResponseEntity.ok(Result.success(nodes.get(0), "查询成功"));
        }

        // 如果没找到，尝试通过 ID 查询
        try {
            Long id = Long.parseLong(nodeCode);
            HospitalNode node = hospitalNodeMapper.selectById(id);
            if (node != null) {
                return ResponseEntity.ok(Result.success(node, "查询成功"));
            }
        } catch (NumberFormatException e) {
            // 不是数字ID，忽略
        }

        return ResponseEntity.status(404)
                .body(Result.notFound("未找到节点: " + nodeCode));
    }

    /**
     * 根据节点编号查询节点（与 node/code 接口保持一致）
     */
    @GetMapping("/code/{nodeCode}")
    @Operation(summary = "根据节点编号获取节点", description = "通过节点编号获取节点信息")
    public ResponseEntity<Result<List<HospitalNode>>> getNodeByCode(@PathVariable String nodeCode) {
        log.info("根据节点编号查询节点: nodeCode={}", nodeCode);

        if (nodeCode == null || nodeCode.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Result.badRequest("节点编号不能为空"));
        }

        List<HospitalNode> nodes = hospitalNodeMapper.selectByNodeCode(nodeCode);

        if (nodes == null || nodes.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Result.notFound("未找到节点编号为 " + nodeCode + " 的节点"));
        }

        return ResponseEntity.ok(Result.success(nodes, "查询成功"));
    }

    /**
     * 搜索位置
     */
    @GetMapping("/search")
    @Operation(summary = "搜索位置", description = "根据关键词搜索位置")
    public ResponseEntity<Result<List<HospitalNode>>> searchLocations(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "10") Integer limit) {
        log.info("搜索位置: keyword={}, limit={}", keyword, limit);

        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Result.badRequest("搜索关键词不能为空"));
        }

        // 使用 MyBatis-Plus 的查询构造器
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<HospitalNode> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();

        // 先设置 isActive 条件，再嵌套 OR 条件
        wrapper.eq(HospitalNode::getIsActive, 1)
               .and(w -> w.like(HospitalNode::getNodeName, keyword.trim())
                           .or()
                           .like(HospitalNode::getDescription, keyword.trim())
                           .or()
                           .like(HospitalNode::getNodeCode, keyword.trim()))
               .last("LIMIT " + limit);

        List<HospitalNode> nodes = hospitalNodeMapper.selectList(wrapper);
        log.info("搜索结果数量: {}", nodes != null ? nodes.size() : 0);

        return ResponseEntity.ok(Result.success(nodes, "搜索成功"));
    }
}