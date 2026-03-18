package com.hospital.arnavigation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.arnavigation.dto.PasswordResetRequest;
import com.hospital.arnavigation.dto.UserListItemResponse;
import com.hospital.arnavigation.dto.UserListResponse;
import com.hospital.arnavigation.dto.UserUpdateRequest;
import com.hospital.arnavigation.exception.ForbiddenException;
import com.hospital.arnavigation.exception.GlobalExceptionHandler;
import com.hospital.arnavigation.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminUserController.class)
@Import(GlobalExceptionHandler.class)
class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @Test
    void listUsersShouldReturnRecordsAndTotal() throws Exception {
        UserListItemResponse item = new UserListItemResponse(
                2L, "admin", "管理员", "", "", null, "ADMIN", "ENABLED", LocalDateTime.now(), LocalDateTime.now()
        );
        when(userService.listUsers("Bearer token-1", 1, 20, null, null, null))
                .thenReturn(new UserListResponse(List.of(item), 1L));

        mockMvc.perform(get("/api/admin/users/list").header("Authorization", "Bearer token-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].username").value("admin"));
    }

    @Test
    void listUsersShouldReturnForbiddenForNonAdmin() throws Exception {
        when(userService.listUsers(eq("Bearer wx-token"), eq(1), eq(20), eq(null), eq(null), eq(null)))
                .thenThrow(new ForbiddenException("无权限访问"));

        mockMvc.perform(get("/api/admin/users/list").header("Authorization", "Bearer wx-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("无权限访问"));
    }

    @Test
    void updatePasswordShouldReturnSuccess() throws Exception {
        PasswordResetRequest request = new PasswordResetRequest();
        request.setNewPassword("new-123456");
        doNothing().when(userService).resetPassword(eq("Bearer token-1"), eq(2L), any(PasswordResetRequest.class));

        mockMvc.perform(put("/api/admin/users/2/password")
                        .header("Authorization", "Bearer token-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("密码修改成功"));
    }

    @Test
    void updateUserShouldAllowChangingIdentity() throws Exception {
        UserUpdateRequest request = new UserUpdateRequest();
        request.setNickname("普通用户");
        request.setUserType("WECHAT");
        request.setStatus("ENABLED");

        UserListItemResponse response = new UserListItemResponse(
                3L, "test-user", "普通用户", "", "", null, "WECHAT", "ENABLED", LocalDateTime.now(), LocalDateTime.now()
        );
        when(userService.updateUser(eq("Bearer token-1"), eq(3L), any(UserUpdateRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put("/api/admin/users/3")
                        .header("Authorization", "Bearer token-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.userType").value("WECHAT"))
                .andExpect(jsonPath("$.data.nickname").value("普通用户"));
    }
}
