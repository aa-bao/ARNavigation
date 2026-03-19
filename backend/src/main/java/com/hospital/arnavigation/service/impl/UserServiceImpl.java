package com.hospital.arnavigation.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hospital.arnavigation.dto.AdminLoginRequest;
import com.hospital.arnavigation.dto.AvatarUploadResponse;
import com.hospital.arnavigation.dto.CurrentUserResponse;
import com.hospital.arnavigation.dto.LoginResponse;
import com.hospital.arnavigation.dto.PasswordResetRequest;
import com.hospital.arnavigation.dto.UserAvatarUpdateRequest;
import com.hospital.arnavigation.dto.UserCreateRequest;
import com.hospital.arnavigation.dto.UserListItemResponse;
import com.hospital.arnavigation.dto.UserListResponse;
import com.hospital.arnavigation.dto.UserStatusUpdateRequest;
import com.hospital.arnavigation.dto.UserUpdateRequest;
import com.hospital.arnavigation.dto.WechatLoginRequest;
import com.hospital.arnavigation.entity.AppUser;
import com.hospital.arnavigation.entity.UserSession;
import com.hospital.arnavigation.exception.ForbiddenException;
import com.hospital.arnavigation.exception.UnauthorizedException;
import com.hospital.arnavigation.mapper.AppUserMapper;
import com.hospital.arnavigation.mapper.UserSessionMapper;
import com.hospital.arnavigation.service.UserService;
import com.hospital.arnavigation.util.PasswordUtils;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Slf4j
public class UserServiceImpl implements UserService {

    private static final String STATUS_ENABLED = "ENABLED";
    private static final String USER_TYPE_ADMIN = "ADMIN";
    private static final String USER_TYPE_WECHAT = "WECHAT";
    private static final long MAX_AVATAR_SIZE = 5L * 1024 * 1024;

    private final AppUserMapper appUserMapper;
    private final UserSessionMapper userSessionMapper;
    private final String avatarRootDir;
    private final String wechatAppId;
    private final String wechatAppSecret;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public UserServiceImpl(
            AppUserMapper appUserMapper,
            UserSessionMapper userSessionMapper,
            @Value("${app.upload.avatar-dir:uploads/avatars}") String avatarRootDir,
            @Value("${app.wechat.appid:}") String wechatAppId,
            @Value("${app.wechat.secret:}") String wechatAppSecret,
            ObjectMapper objectMapper) {
        this.appUserMapper = appUserMapper;
        this.userSessionMapper = userSessionMapper;
        this.avatarRootDir = avatarRootDir;
        this.wechatAppId = wechatAppId;
        this.wechatAppSecret = wechatAppSecret;
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public LoginResponse adminLogin(AdminLoginRequest request) {
        if (isBlank(request.getUsername()) || isBlank(request.getPassword())) {
            throw new IllegalArgumentException("用户名和密码不能为空");
        }

        AppUser user = appUserMapper.selectByUsername(request.getUsername().trim());
        if (user == null || !USER_TYPE_ADMIN.equals(user.getUserType())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }
        if (!STATUS_ENABLED.equals(user.getStatus())) {
            throw new IllegalArgumentException("账号已被禁用");
        }
        if (!PasswordUtils.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        return buildLoginResponse(user, "ADMIN_PASSWORD");
    }

    @Override
    @Transactional
    public LoginResponse wechatLogin(WechatLoginRequest request) {
        if (isBlank(request.getCode())) {
            throw new IllegalArgumentException("微信登录 code 不能为空");
        }

        WechatCode2SessionResponse sessionResponse = exchangeCodeForSession(request.getCode().trim());
        String openid = trimToNull(sessionResponse.openid());
        if (openid == null) {
            throw new IllegalStateException("WeChat login failed: openid is missing");
        }
        AppUser user = appUserMapper.selectByOpenid(openid);
        if (user == null) {
            user = new AppUser();
            user.setOpenid(openid);
            user.setUnionid(trimToNull(sessionResponse.unionid()));
            user.setUsername("wx_" + openid.substring(Math.max(0, openid.length() - 10)));
            user.setNickname(defaultWechatNickname(request.getNickname(), openid));
            user.setAvatarUrl(request.getAvatarUrl());
            user.setUserType(USER_TYPE_WECHAT);
            user.setStatus(STATUS_ENABLED);
            user.setDeleted(0);
            appUserMapper.insert(user);
        } else {
            if (!isBlank(sessionResponse.unionid())) {
                user.setUnionid(sessionResponse.unionid().trim());
            }
            if (!isBlank(request.getNickname())) {
                user.setNickname(request.getNickname().trim());
            }
            if (!isBlank(request.getAvatarUrl())) {
                user.setAvatarUrl(request.getAvatarUrl().trim());
            }
            if (!STATUS_ENABLED.equals(user.getStatus())) {
                throw new IllegalArgumentException("账号已被禁用");
            }
            appUserMapper.updateById(user);
        }

        return buildLoginResponse(user, "WECHAT_MINI_PROGRAM");
    }

    private WechatCode2SessionResponse exchangeCodeForSession(String code) {
        if (isBlank(wechatAppId) || isBlank(wechatAppSecret)) {
            throw new IllegalStateException(
                    "WeChat config missing: set app.wechat.appid/app.wechat.secret "
                            + "or env APP_WECHAT_APPID/APP_WECHAT_SECRET "
                            + "(compatible with WECHAT_APP_ID/WECHAT_APP_SECRET)");
        }

        try {
            String url = "https://api.weixin.qq.com/sns/jscode2session"
                    + "?appid=" + URLEncoder.encode(wechatAppId.trim(), StandardCharsets.UTF_8)
                    + "&secret=" + URLEncoder.encode(wechatAppSecret.trim(), StandardCharsets.UTF_8)
                    + "&js_code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                    + "&grant_type=authorization_code";

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() != 200) {
                throw new IllegalStateException("WeChat code2Session HTTP error: " + response.statusCode());
            }

            WechatCode2SessionResponse parsed = objectMapper.readValue(response.body(), WechatCode2SessionResponse.class);
            if (parsed.errcode() != null && parsed.errcode() != 0) {
                log.warn("WeChat code2Session failed: errcode={}, errmsg={}", parsed.errcode(), parsed.errmsg());
                throw new IllegalArgumentException("微信授权登录失败，请重试");
            }
            return parsed;
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("WeChat code2Session request failed", ex);
            throw new IllegalStateException("微信登录服务异常，请稍后重试");
        }
    }

    private record WechatCode2SessionResponse(
            String openid,
            String session_key,
            String unionid,
            Integer errcode,
            @JsonProperty("errmsg") String errmsg) {
    }

    @Override
    public CurrentUserResponse getCurrentUser(String authorizationHeader) {
        AppUser user = requireUser(authorizationHeader);
        return toCurrentUser(user);
    }

    @Override
    public AvatarUploadResponse uploadAvatar(String authorizationHeader, MultipartFile file) {
        requireUser(authorizationHeader);
        return new AvatarUploadResponse(storeAvatar(file));
    }

    @Override
    @Transactional
    public CurrentUserResponse updateCurrentUserAvatar(String authorizationHeader, UserAvatarUpdateRequest request) {
        AppUser user = requireUser(authorizationHeader);
        String avatarUrl = trimToNull(request.getAvatarUrl());
        if (isBlank(avatarUrl)) {
            throw new IllegalArgumentException("头像地址不能为空");
        }
        user.setAvatarUrl(avatarUrl);
        appUserMapper.updateById(user);
        return toCurrentUser(user);
    }

    @Override
    @Transactional
    public void logout(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        UserSession session = userSessionMapper.selectActiveByToken(token, LocalDateTime.now());
        if (session != null) {
            session.setDeleted(1);
            userSessionMapper.updateById(session);
        }
    }

    @Override
    public UserListResponse listUsers(String authorizationHeader, Integer page, Integer pageSize, String keyword, String userType, String status) {
        requireAdmin(authorizationHeader);

        int safePage = page == null || page < 1 ? 1 : page;
        int safePageSize = pageSize == null || pageSize < 1 ? 20 : Math.min(pageSize, 100);

        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<AppUser>()
                .eq(AppUser::getDeleted, 0)
                .orderByDesc(AppUser::getCreatedAt);
        if (!isBlank(keyword)) {
            wrapper.and(q -> q.like(AppUser::getUsername, keyword.trim())
                    .or()
                    .like(AppUser::getNickname, keyword.trim())
                    .or()
                    .like(AppUser::getPhone, keyword.trim())
                    .or()
                    .like(AppUser::getOpenid, keyword.trim()));
        }
        if (!isBlank(userType)) {
            wrapper.eq(AppUser::getUserType, userType.trim().toUpperCase());
        }
        if (!isBlank(status)) {
            wrapper.eq(AppUser::getStatus, status.trim().toUpperCase());
        }

        List<AppUser> all = appUserMapper.selectList(wrapper);
        int fromIndex = Math.min((safePage - 1) * safePageSize, all.size());
        int toIndex = Math.min(fromIndex + safePageSize, all.size());
        List<UserListItemResponse> records = all.subList(fromIndex, toIndex).stream()
                .map(this::toUserListItem)
                .toList();
        return new UserListResponse(records, (long) all.size());
    }

    @Override
    @Transactional
    public UserListItemResponse createUser(String authorizationHeader, UserCreateRequest request) {
        requireAdmin(authorizationHeader);
        if (isBlank(request.getUsername())) {
            throw new IllegalArgumentException("用户名不能为空");
        }
        String userType = normalizeUserType(request.getUserType(), USER_TYPE_ADMIN);
        if (appUserMapper.selectByUsername(request.getUsername().trim()) != null) {
            throw new IllegalArgumentException("用户名已存在");
        }
        if (USER_TYPE_ADMIN.equals(userType) && isBlank(request.getPassword())) {
            throw new IllegalArgumentException("管理员密码不能为空");
        }

        AppUser user = new AppUser();
        user.setUsername(request.getUsername().trim());
        user.setPasswordHash(USER_TYPE_ADMIN.equals(userType) ? PasswordUtils.sha256(request.getPassword()) : null);
        user.setNickname(isBlank(request.getNickname()) ? request.getUsername().trim() : request.getNickname().trim());
        user.setAvatarUrl(trimToNull(request.getAvatarUrl()));
        user.setPhone(trimToNull(request.getPhone()));
        user.setUserType(userType);
        user.setStatus(isBlank(request.getStatus()) ? STATUS_ENABLED : request.getStatus().trim().toUpperCase());
        user.setDeleted(0);
        appUserMapper.insert(user);
        return toUserListItem(user);
    }

    @Override
    @Transactional
    public UserListItemResponse updateUser(String authorizationHeader, Long id, UserUpdateRequest request) {
        requireAdmin(authorizationHeader);
        AppUser user = getUserById(id);
        String nextUserType = isBlank(request.getUserType())
                ? user.getUserType()
                : normalizeUserType(request.getUserType(), user.getUserType());
        user.setNickname(trimToNull(request.getNickname()));
        user.setAvatarUrl(trimToNull(request.getAvatarUrl()));
        user.setPhone(trimToNull(request.getPhone()));
        user.setUserType(nextUserType);
        if (!isBlank(request.getStatus())) {
            user.setStatus(request.getStatus().trim().toUpperCase());
        }
        if (USER_TYPE_ADMIN.equals(nextUserType)) {
            if (!isBlank(request.getPassword())) {
                user.setPasswordHash(PasswordUtils.sha256(request.getPassword().trim()));
            } else if (isBlank(user.getPasswordHash())) {
                throw new IllegalArgumentException("管理员身份必须设置密码");
            }
        } else {
            user.setPasswordHash(null);
        }
        appUserMapper.updateById(user);
        return toUserListItem(user);
    }

    @Override
    @Transactional
    public UserListItemResponse updateUserStatus(String authorizationHeader, Long id, UserStatusUpdateRequest request) {
        requireAdmin(authorizationHeader);
        if (isBlank(request.getStatus())) {
            throw new IllegalArgumentException("状态不能为空");
        }
        AppUser user = getUserById(id);
        user.setStatus(request.getStatus().trim().toUpperCase());
        appUserMapper.updateById(user);
        return toUserListItem(user);
    }

    @Override
    @Transactional
    public void resetPassword(String authorizationHeader, Long id, PasswordResetRequest request) {
        requireAdmin(authorizationHeader);
        AppUser user = getUserById(id);
        if (!USER_TYPE_ADMIN.equals(user.getUserType())) {
            throw new IllegalArgumentException("仅管理员支持重置密码");
        }
        String newPassword = isBlank(request.getNewPassword()) ? "123456" : request.getNewPassword().trim();
        user.setPasswordHash(PasswordUtils.sha256(newPassword));
        appUserMapper.updateById(user);
    }

    private LoginResponse buildLoginResponse(AppUser user, String loginType) {
        user.setLastLoginAt(LocalDateTime.now());
        appUserMapper.updateById(user);

        UserSession session = new UserSession();
        session.setUserId(user.getId());
        session.setToken(UUID.randomUUID().toString().replace("-", ""));
        session.setLoginType(loginType);
        session.setExpiresAt(LocalDateTime.now().plusDays(30));
        session.setLastAccessAt(LocalDateTime.now());
        session.setDeleted(0);
        userSessionMapper.insert(session);
        return new LoginResponse(session.getToken(), toCurrentUser(user));
    }

    private AppUser requireAdmin(String authorizationHeader) {
        AppUser user = requireUser(authorizationHeader);
        if (!USER_TYPE_ADMIN.equals(user.getUserType())) {
            throw new ForbiddenException("无权限访问");
        }
        return user;
    }

    private AppUser requireUser(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        UserSession session = userSessionMapper.selectActiveByToken(token, LocalDateTime.now());
        if (session == null) {
            throw new UnauthorizedException("登录已失效");
        }
        session.setLastAccessAt(LocalDateTime.now());
        userSessionMapper.updateById(session);

        AppUser user = appUserMapper.selectById(session.getUserId());
        if (user == null || user.getDeleted() != null && user.getDeleted() == 1) {
            throw new IllegalArgumentException("用户不存在");
        }
        if (!STATUS_ENABLED.equals(user.getStatus())) {
            throw new IllegalArgumentException("账号已被禁用");
        }
        return user;
    }

    private AppUser getUserById(Long id) {
        AppUser user = appUserMapper.selectById(id);
        if (user == null || user.getDeleted() != null && user.getDeleted() == 1) {
            throw new IllegalArgumentException("用户不存在");
        }
        return user;
    }

    private String extractBearerToken(String authorizationHeader) {
        if (isBlank(authorizationHeader)) {
            throw new UnauthorizedException("未登录");
        }
        String header = authorizationHeader.trim();
        if (header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        return header;
    }

    private CurrentUserResponse toCurrentUser(AppUser user) {
        return new CurrentUserResponse(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getAvatarUrl(),
                user.getPhone(),
                user.getUserType(),
                user.getStatus()
        );
    }

    private UserListItemResponse toUserListItem(AppUser user) {
        return new UserListItemResponse(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getAvatarUrl(),
                user.getPhone(),
                user.getOpenid(),
                user.getUserType(),
                user.getStatus(),
                user.getLastLoginAt(),
                user.getCreatedAt()
        );
    }

    private String defaultWechatNickname(String nickname, String openid) {
        if (!isBlank(nickname)) {
            return nickname.trim();
        }
        return "微信用户" + openid.substring(Math.max(0, openid.length() - 6));
    }

    private String storeAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("请选择要上传的头像");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new IllegalArgumentException("头像不能超过 5MB");
        }

        String extension = extractImageExtension(file.getOriginalFilename(), file.getContentType());
        String fileName = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        Path uploadDir = Paths.get(avatarRootDir).toAbsolutePath().normalize();
        Path target = uploadDir.resolve(fileName).normalize();
        try {
            Files.createDirectories(uploadDir);
            file.transferTo(target);
        } catch (IOException e) {
            throw new IllegalStateException("头像存储失败", e);
        }
        return "/uploads/avatars/" + fileName;
    }

    private String normalizeUserType(String userType, String defaultValue) {
        String resolved = isBlank(userType) ? defaultValue : userType.trim().toUpperCase(Locale.ROOT);
        if (!USER_TYPE_ADMIN.equals(resolved) && !USER_TYPE_WECHAT.equals(resolved)) {
            throw new IllegalArgumentException("身份仅支持 ADMIN 或 WECHAT");
        }
        return resolved;
    }

    private String extractImageExtension(String originalFilename, String contentType) {
        String lowerName = originalFilename == null ? "" : originalFilename.toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".png")) {
            return "png";
        }
        if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
            return "jpg";
        }
        if (lowerName.endsWith(".webp")) {
            return "webp";
        }

        if (contentType == null) {
            throw new IllegalArgumentException("仅支持 png、jpg、webp 图片");
        }

        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> "png";
            case "image/jpeg", "image/jpg" -> "jpg";
            case "image/webp" -> "webp";
            default -> throw new IllegalArgumentException("仅支持 png、jpg、webp 图片");
        };
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }
}
