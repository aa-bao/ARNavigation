package com.hospital.arnavigation;

import com.hospital.arnavigation.common.Result;
import com.hospital.arnavigation.dto.NavigationRequestDTO;
import com.hospital.arnavigation.dto.NavigationResponseDTO;
import com.hospital.arnavigation.dto.PathNodeDTO;
import com.hospital.arnavigation.entity.HospitalNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

/**
 * 导航集成测试类
 * 测试完整的导航流程、API端点和异常处理
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class NavigationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/navigation";

    @BeforeEach
    void setUp() {
        // 测试前的初始化
    }

    @Test
    @DisplayName("测试健康检查接口")
    void testHealthCheck() throws Exception {
        mockMvc.perform(get(BASE_URL + "/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.service").value("Hospital AR Navigation System"));
    }

    @Test
    @DisplayName("测试完整导航流程 - 同楼层路径")
    void testCompleteNavigationSameFloor() throws Exception {
        // 创建导航请求
        NavigationRequestDTO request = new NavigationRequestDTO();
        request.setStartNodeId(1L);
        request.setEndNodeId(5L);
        request.setPreferElevator(true);
        request.setAvoidStairs(false);

        String requestJson = objectMapper.writeValueAsString(request);

        // 执行请求
        MvcResult result = mockMvc.perform(post(BASE_URL + "/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andReturn();

        // 解析响应
        String responseJson = result.getResponse().getContentAsString();
        Result<NavigationResponseDTO> response = objectMapper.readValue(
                responseJson,
                objectMapper.getTypeFactory().constructParametricType(Result.class, NavigationResponseDTO.class)
        );

        // 验证响应
        assertNotNull(response);
        assertEquals(200, response.getCode());
        assertNotNull(response.getData());

        NavigationResponseDTO navResponse = response.getData();
        assertEquals("SUCCESS", navResponse.getStatus());
        assertNotNull(navResponse.getPathNodes());
        assertTrue(navResponse.getDistance() >= 0);
        assertTrue(navResponse.getEstimatedTime() >= 0);
        assertNotNull(navResponse.getDirections());
    }

    @Test
    @DisplayName("测试完整导航流程 - 跨楼层路径")
    void testCompleteNavigationCrossFloor() throws Exception {
        NavigationRequestDTO request = new NavigationRequestDTO();
        request.setStartNodeId(1L);  // 1层入口
        request.setEndNodeId(20L);   // 假设是3层某个房间
        request.setPreferElevator(true);
        request.setAvoidStairs(false);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post(BASE_URL + "/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));
    }

    @Test
    @DisplayName("测试API端点 - 参数校验失败")
    void testApiValidationFailure() throws Exception {
        // 测试缺少必需参数
        NavigationRequestDTO request = new NavigationRequestDTO();
        request.setStartNodeId(null);  // 缺少起点
        request.setEndNodeId(2L);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post(BASE_URL + "/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("测试API端点 - 不存在的节点")
    void testApiNonExistentNode() throws Exception {
        NavigationRequestDTO request = new NavigationRequestDTO();
        request.setStartNodeId(99999L);  // 不存在的节点
        request.setEndNodeId(99998L);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post(BASE_URL + "/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("测试获取相邻节点接口")
    void testGetNeighborsApi() throws Exception {
        mockMvc.perform(get(BASE_URL + "/node/{nodeId}/neighbors", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("测试根据节点编号查询接口")
    void testGetNodeByCodeApi() throws Exception {
        mockMvc.perform(get(BASE_URL + "/node/code/{nodeCode}", "ENT-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("测试异常处理 - 无效节点ID")
    void testExceptionHandlingInvalidNodeId() throws Exception {
        mockMvc.perform(get(BASE_URL + "/node/{nodeId}/neighbors", -1L))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get(BASE_URL + "/node/{nodeId}/neighbors", 0L))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("测试异常处理 - 空节点编号")
    void testExceptionHandlingEmptyNodeCode() throws Exception {
        mockMvc.perform(get(BASE_URL + "/node/code/{nodeCode}", ""))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("测试完整导航流程 - 起点等于终点")
    void testNavigationSameStartAndEnd() throws Exception {
        NavigationRequestDTO request = new NavigationRequestDTO();
        request.setStartNodeId(1L);
        request.setEndNodeId(1L);  // 起点等于终点
        request.setPreferElevator(true);
        request.setAvoidStairs(false);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post(BASE_URL + "/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.distance").value(0.0))
                .andExpect(jsonPath("$.data.estimatedTime").value(0));
    }
}
