package com.hospital.arnavigation.controller;

import com.hospital.arnavigation.common.Result;
import com.hospital.arnavigation.dto.AdminLoginRequest;
import com.hospital.arnavigation.dto.AvatarUploadResponse;
import com.hospital.arnavigation.dto.CurrentUserResponse;
import com.hospital.arnavigation.dto.LoginResponse;
import com.hospital.arnavigation.dto.UserAvatarUpdateRequest;
import com.hospital.arnavigation.dto.WechatLoginRequest;
import com.hospital.arnavigation.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    @PostMapping("/admin/login")
    public Result<LoginResponse> adminLogin(@RequestBody AdminLoginRequest request) {
        log.info("admin login: username={}", request.getUsername());
        return Result.success(userService.adminLogin(request), "登录成功");
    }

    @PostMapping("/wechat/login")
    public Result<LoginResponse> wechatLogin(@RequestBody WechatLoginRequest request) {
        log.info("wechat mini program login");
        return Result.success(userService.wechatLogin(request), "登录成功");
    }

    @PostMapping("/login")
    public Result<LoginResponse> compatibleWechatLogin(@RequestBody WechatLoginRequest request) {
        return wechatLogin(request);
    }

    @GetMapping("/info")
    public Result<CurrentUserResponse> getUserInfo(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return Result.success(userService.getCurrentUser(authorizationHeader), "查询成功");
    }

    @PostMapping("/avatar")
    public Result<AvatarUploadResponse> uploadAvatar(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestPart("file") MultipartFile file) {
        return Result.success(userService.uploadAvatar(authorizationHeader, file), "上传成功");
    }

    @PutMapping("/profile/avatar")
    public Result<CurrentUserResponse> updateCurrentUserAvatar(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody UserAvatarUpdateRequest request) {
        return Result.success(userService.updateCurrentUserAvatar(authorizationHeader, request), "更新成功");
    }

    @PostMapping("/logout")
    public Result<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        userService.logout(authorizationHeader);
        return Result.success(null, "退出成功");
    }
}
