package com.hospital.arnavigation.controller;

import com.hospital.arnavigation.dto.AdminRecentNavigationListResponse;
import com.hospital.arnavigation.dto.AdminRecentNavigationRecordDTO;
import com.hospital.arnavigation.exception.GlobalExceptionHandler;
import com.hospital.arnavigation.service.RecentNavigationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminNavigationRecordControllerTest {

    @Mock
    private RecentNavigationService recentNavigationService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AdminNavigationRecordController controller = new AdminNavigationRecordController(recentNavigationService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void listRecordsShouldReturnData() throws Exception {
        AdminRecentNavigationRecordDTO record = AdminRecentNavigationRecordDTO.builder()
                .id(1L)
                .userId(2L)
                .username("wx_user")
                .nickname("张三")
                .nodeId(10L)
                .nodeCode("A-101")
                .nodeName("门诊大厅")
                .floor(1)
                .nodeType("REGISTRATION")
                .lastNavigatedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        when(recentNavigationService.listRecentNavigationsForAdmin("Bearer token-1", 1, 20, null, null))
                .thenReturn(new AdminRecentNavigationListResponse(List.of(record), 1L));

        mockMvc.perform(get("/api/admin/navigation-records/list")
                        .header("Authorization", "Bearer token-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].username").value("wx_user"));
    }

    @Test
    void deleteByIdShouldReturnSuccess() throws Exception {
        when(recentNavigationService.deleteRecentNavigationForAdmin(eq("Bearer token-1"), eq(1L)))
                .thenReturn(true);

        mockMvc.perform(delete("/api/admin/navigation-records/1")
                        .header("Authorization", "Bearer token-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void deleteByUserIdShouldReturnDeletedCount() throws Exception {
        when(recentNavigationService.deleteRecentNavigationsByUserForAdmin(eq("Bearer token-1"), eq(2L)))
                .thenReturn(3);

        mockMvc.perform(delete("/api/admin/navigation-records/user/2")
                        .header("Authorization", "Bearer token-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deletedCount").value(3));
    }
}
