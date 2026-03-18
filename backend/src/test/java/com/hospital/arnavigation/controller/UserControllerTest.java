package com.hospital.arnavigation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.arnavigation.dto.AdminLoginRequest;
import com.hospital.arnavigation.dto.AvatarUploadResponse;
import com.hospital.arnavigation.dto.CurrentUserResponse;
import com.hospital.arnavigation.dto.LoginResponse;
import com.hospital.arnavigation.dto.UserAvatarUpdateRequest;
import com.hospital.arnavigation.exception.GlobalExceptionHandler;
import com.hospital.arnavigation.exception.UnauthorizedException;
import com.hospital.arnavigation.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import(GlobalExceptionHandler.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @Test
    void adminLoginShouldReturnTokenAndUserInfo() throws Exception {
        CurrentUserResponse userInfo = new CurrentUserResponse(1L, "admin", "管理员", "", "", "ADMIN", "ENABLED");
        when(userService.adminLogin(any(AdminLoginRequest.class)))
                .thenReturn(new LoginResponse("token-1", userInfo));

        AdminLoginRequest request = new AdminLoginRequest();
        request.setUsername("admin");
        request.setPassword("123456");

        mockMvc.perform(post("/api/user/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").value("token-1"))
                .andExpect(jsonPath("$.data.userInfo.username").value("admin"))
                .andExpect(jsonPath("$.data.userInfo.userType").value("ADMIN"));
    }

    @Test
    void getUserInfoShouldReturnUnauthorizedWhenTokenMissing() throws Exception {
        when(userService.getCurrentUser(null)).thenThrow(new UnauthorizedException("未登录"));

        mockMvc.perform(get("/api/user/info"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.message").value("未登录"));
    }

    @Test
    void logoutShouldReturnSuccess() throws Exception {
        mockMvc.perform(post("/api/user/logout").header("Authorization", "Bearer token-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void uploadAvatarShouldReturnAvatarUrl() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                MediaType.IMAGE_PNG_VALUE,
                "avatar-content".getBytes()
        );
        when(userService.uploadAvatar(any(), any()))
                .thenReturn(new AvatarUploadResponse("/uploads/avatars/avatar.png"));

        mockMvc.perform(multipart("/api/user/avatar")
                        .file(file)
                        .header("Authorization", "Bearer token-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.avatarUrl").value("/uploads/avatars/avatar.png"));
    }

    @Test
    void updateMyAvatarShouldReturnUpdatedUserInfo() throws Exception {
        CurrentUserResponse response = new CurrentUserResponse(
                1L,
                "wx_user",
                "微信用户",
                "/uploads/avatars/new-avatar.png",
                "",
                "WECHAT",
                "ENABLED"
        );
        UserAvatarUpdateRequest request = new UserAvatarUpdateRequest();
        request.setAvatarUrl("/uploads/avatars/new-avatar.png");
        when(userService.updateCurrentUserAvatar(eq("Bearer token-1"), any(UserAvatarUpdateRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put("/api/user/profile/avatar")
                        .header("Authorization", "Bearer token-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.avatarUrl").value("/uploads/avatars/new-avatar.png"))
                .andExpect(jsonPath("$.data.username").value("wx_user"));
    }
}
