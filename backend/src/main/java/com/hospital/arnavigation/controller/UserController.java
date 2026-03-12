package com.hospital.arnavigation.controller;

import com.hospital.arnavigation.common.Result;
import com.hospital.arnavigation.dto.WechatLoginRequest;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 用户控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/user")
public class UserController {

    // 模拟用户数据（实际项目中应从数据库查询）
    private static final Map<String, String> MOCK_USERS = new HashMap<>();

    static {
        MOCK_USERS.put("admin", "123456");
        MOCK_USERS.put("user1", "123456");
        MOCK_USERS.put("test", "test");
    }

    /**
     * 微信小程序登录
     * 通过 wx.login() 获取的 code 换取自定义登录态
     */
    @PostMapping("/login")
    public Result<LoginResponse> login(@RequestBody WechatLoginRequest request) {
        log.info("微信小程序登录请求");

        // 参数校验
        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            return Result.error(400, "登录凭证不能为空");
        }

        // TODO: 实际项目中需要调用微信接口验证 code
        // 目前使用模拟登录，直接生成 token
        // 微信接口调用示例：
        // String url = "https://api.weixin.qq.com/sns/jscode2session" +
        //              "?appid=" + appId +
        //              "&secret=" + appSecret +
        //              "&js_code=" + request.getCode() +
        //              "&grant_type=authorization_code";
        // 返回 openid 和 session_key，用于生成自定义登录态

        // 生成 token
        String token = UUID.randomUUID().toString().replace("-", "");

        // 模拟用户数据（实际应从数据库查询或创建新用户）
        String mockOpenid = "user_" + request.getCode().hashCode();

        // 构建响应
        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setUsername(mockOpenid);
        response.setNickname("微信用户" + mockOpenid.substring(mockOpenid.length() - 6));

        log.info("用户登录成功: openid={}", mockOpenid);
        return Result.success(response, "登录成功");
    }

    /**
     * 获取当前用户信息
     */
    @GetMapping("/info")
    public Result<UserInfo> getUserInfo(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return Result.error(400,"未登录");
        }

        // 模拟返回用户信息
        UserInfo userInfo = new UserInfo();
        userInfo.setUsername("admin");
        userInfo.setNickname("管理员");
        userInfo.setAvatar("");

        return Result.success(userInfo);
    }

    /**
     * 退出登录
     */
    @PostMapping("/logout")
    public Result<Void> logout(@RequestHeader(value = "Authorization", required = false) String token) {
        log.info("用户退出登录");
        // 实际项目中需要清除token缓存
        return Result.success(null, "退出成功");
    }

    // ============== DTO ==============

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @Data
    public static class LoginResponse {
        private String token;
        private String username;
        private String nickname;
    }

    @Data
    public static class UserInfo {
        private String username;
        private String nickname;
        private String avatar;
    }
}
