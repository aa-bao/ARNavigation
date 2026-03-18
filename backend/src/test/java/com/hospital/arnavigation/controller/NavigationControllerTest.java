package com.hospital.arnavigation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.service.PathFindingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NavigationController.class)
class NavigationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PathFindingService pathFindingService;

    @MockBean
    private HospitalNodeMapper hospitalNodeMapper;

    @Test
    void createNodeShouldReturnBadRequestWhenNodeNameAlreadyExists() throws Exception {
        HospitalNode existing = new HospitalNode();
        existing.setId(1L);
        existing.setNodeCode("A001");
        existing.setNodeName("接待一");

        when(hospitalNodeMapper.selectByNodeCode(anyString())).thenReturn(List.of());
        when(hospitalNodeMapper.selectByNodeName("接待一")).thenReturn(List.of(existing));

        HospitalNode request = new HospitalNode();
        request.setNodeCode("A002");
        request.setNodeName("接待一");
        request.setFloor(1);
        request.setXCoordinate(10.0);
        request.setYCoordinate(20.0);
        request.setNodeType("NORMAL");
        request.setDescription("测试节点");

        mockMvc.perform(post("/api/navigation/node")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(400))
            .andExpect(jsonPath("$.message").value("节点名称 接待一 已存在"));
    }
}
