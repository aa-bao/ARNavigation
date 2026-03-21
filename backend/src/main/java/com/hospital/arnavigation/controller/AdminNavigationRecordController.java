package com.hospital.arnavigation.controller;

import com.hospital.arnavigation.common.Result;
import com.hospital.arnavigation.dto.AdminRecentNavigationListResponse;
import com.hospital.arnavigation.dto.DeleteCountResponse;
import com.hospital.arnavigation.service.RecentNavigationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/navigation-records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminNavigationRecordController {

    private final RecentNavigationService recentNavigationService;

    @GetMapping("/list")
    public Result<AdminRecentNavigationListResponse> listRecords(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long userId) {
        return Result.success(
                recentNavigationService.listRecentNavigationsForAdmin(authorizationHeader, page, pageSize, keyword, userId),
                "查询成功"
        );
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteById(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id) {
        boolean deleted = recentNavigationService.deleteRecentNavigationForAdmin(authorizationHeader, id);
        if (!deleted) {
            return Result.notFound("记录不存在");
        }
        return Result.success(null, "删除成功");
    }

    @DeleteMapping("/user/{userId}")
    public Result<DeleteCountResponse> deleteByUserId(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long userId) {
        int deletedCount = recentNavigationService.deleteRecentNavigationsByUserForAdmin(authorizationHeader, userId);
        return Result.success(new DeleteCountResponse(deletedCount), "删除成功");
    }
}
