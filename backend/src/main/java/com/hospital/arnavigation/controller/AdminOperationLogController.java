package com.hospital.arnavigation.controller;

import com.hospital.arnavigation.common.Result;
import com.hospital.arnavigation.dto.AdminOperationLogCreateRequest;
import com.hospital.arnavigation.dto.AdminOperationLogItemResponse;
import com.hospital.arnavigation.dto.AdminOperationLogListResponse;
import com.hospital.arnavigation.service.AdminOperationLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminOperationLogController {

    private final AdminOperationLogService adminOperationLogService;

    @GetMapping("/list")
    public Result<AdminOperationLogListResponse> listLogs(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer pageSize,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime) {
        return Result.success(
                adminOperationLogService.listLogs(authorizationHeader, page, pageSize, module, keyword, startTime, endTime),
                "查询成功"
        );
    }

    @PostMapping
    public Result<AdminOperationLogItemResponse> createLog(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody AdminOperationLogCreateRequest request) {
        return Result.success(adminOperationLogService.createLog(authorizationHeader, request), "记录成功");
    }

    @DeleteMapping("/clear")
    public Result<Void> clearLogs(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        adminOperationLogService.clearLogs(authorizationHeader);
        return Result.success(null, "清空成功");
    }
}
