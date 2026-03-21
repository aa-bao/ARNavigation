package com.hospital.arnavigation.controller;

import com.hospital.arnavigation.common.Result;
import com.hospital.arnavigation.dto.PasswordResetRequest;
import com.hospital.arnavigation.dto.UserCreateRequest;
import com.hospital.arnavigation.dto.UserListItemResponse;
import com.hospital.arnavigation.dto.UserListResponse;
import com.hospital.arnavigation.dto.UserStatusUpdateRequest;
import com.hospital.arnavigation.dto.UserUpdateRequest;
import com.hospital.arnavigation.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminUserController {

    private final UserService userService;

    @GetMapping("/list")
    public Result<UserListResponse> listUsers(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String userType,
            @RequestParam(required = false) String status) {
        return Result.success(
                userService.listUsers(authorizationHeader, page, pageSize, keyword, userType, status),
                "查询成功"
        );
    }

    @PostMapping
    public Result<UserListItemResponse> createUser(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody UserCreateRequest request) {
        return Result.success(userService.createUser(authorizationHeader, request), "创建成功");
    }

    @PutMapping("/{id}")
    public Result<UserListItemResponse> updateUser(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestBody UserUpdateRequest request) {
        return Result.success(userService.updateUser(authorizationHeader, id, request), "更新成功");
    }

    @PutMapping("/{id}/status")
    public Result<UserListItemResponse> updateUserStatus(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestBody UserStatusUpdateRequest request) {
        return Result.success(userService.updateUserStatus(authorizationHeader, id, request), "状态更新成功");
    }

    @PutMapping("/{id}/password/reset")
    public Result<Void> resetPassword(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestBody PasswordResetRequest request) {
        userService.resetPassword(authorizationHeader, id, request);
        return Result.success(null, "密码重置成功");
    }

    @PutMapping("/{id}/password")
    public Result<Void> updatePassword(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestBody PasswordResetRequest request) {
        userService.resetPassword(authorizationHeader, id, request);
        return Result.success(null, "密码修改成功");
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteUser(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id) {
        userService.deleteUser(authorizationHeader, id);
        return Result.success(null, "删除成功");
    }
}
