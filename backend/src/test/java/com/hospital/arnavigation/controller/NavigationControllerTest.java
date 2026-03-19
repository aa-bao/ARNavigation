package com.hospital.arnavigation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.arnavigation.dto.NavigationDestinationDTO;
import com.hospital.arnavigation.dto.NavigationNodeDTO;
import com.hospital.arnavigation.dto.NavigationPointDTO;
import com.hospital.arnavigation.dto.NavigationSegmentRequestDTO;
import com.hospital.arnavigation.dto.NavigationSegmentResponseDTO;
import com.hospital.arnavigation.dto.RecentNavigationDTO;
import com.hospital.arnavigation.dto.RecentNavigationRequestDTO;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.mapper.AppUserMapper;
import com.hospital.arnavigation.mapper.HospitalEdgeMapper;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.mapper.UserRecentNavigationMapper;
import com.hospital.arnavigation.mapper.UserSessionMapper;
import com.hospital.arnavigation.service.NavigationDestinationService;
import com.hospital.arnavigation.service.NavigationSegmentService;
import com.hospital.arnavigation.service.PathFindingService;
import com.hospital.arnavigation.service.RecentNavigationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
    private NavigationSegmentService navigationSegmentService;

    @MockBean
    private NavigationDestinationService navigationDestinationService;

    @MockBean
    private RecentNavigationService recentNavigationService;

    @MockBean
    private HospitalNodeMapper hospitalNodeMapper;

    @MockBean
    private HospitalEdgeMapper hospitalEdgeMapper;

    @MockBean
    private AppUserMapper appUserMapper;

    @MockBean
    private UserSessionMapper userSessionMapper;

    @MockBean
    private UserRecentNavigationMapper userRecentNavigationMapper;

    @Test
    void getNodeByCodeShouldReturnNormalizedNode() throws Exception {
        NavigationNodeDTO node = NavigationNodeDTO.builder()
                .nodeId(11L)
                .nodeCode("QR_A_001")
                .nodeName("Entrance A")
                .floor(1)
                .nodeType("ENTRANCE")
                .description("Main entrance")
                .planarX(12.5d)
                .planarY(8.0d)
                .worldX(12.5d)
                .worldY(4.5d)
                .worldZ(8.0d)
                .build();

        when(navigationSegmentService.findNormalizedNodeByCode("QR_A_001")).thenReturn(node);

        mockMvc.perform(get("/api/navigation/node/code/QR_A_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.nodeCode").value("QR_A_001"))
                .andExpect(jsonPath("$.data.planarX").value(12.5))
                .andExpect(jsonPath("$.data.worldY").value(4.5));
    }

    @Test
    void buildSegmentShouldReturnSuccess() throws Exception {
        NavigationPointDTO startPoint = NavigationPointDTO.builder()
                .nodeId(11L)
                .nodeCode("QR_A_001")
                .nodeName("Entrance A")
                .floor(1)
                .nodeType("ENTRANCE")
                .description("Main entrance")
                .planarX(12.5d)
                .planarY(8.0d)
                .worldX(12.5d)
                .worldY(4.5d)
                .worldZ(8.0d)
                .distanceFromPrevious(0.0d)
                .directionAngle(0.0d)
                .build();

        NavigationPointDTO endPoint = NavigationPointDTO.builder()
                .nodeId(12L)
                .nodeCode("QR_A_002")
                .nodeName("Corridor")
                .floor(1)
                .nodeType("NORMAL")
                .description("Hallway")
                .planarX(18.0d)
                .planarY(8.0d)
                .worldX(18.0d)
                .worldY(4.5d)
                .worldZ(8.0d)
                .distanceFromPrevious(5.5d)
                .directionAngle(0.0d)
                .build();

        NavigationSegmentResponseDTO response = NavigationSegmentResponseDTO.builder()
                .status("SUCCESS")
                .isFinalSegment(Boolean.TRUE)
                .segmentStart(startPoint)
                .segmentEnd(endPoint)
                .segmentPoints(List.of(startPoint, endPoint))
                .build();

        when(navigationSegmentService.buildSegment("QR_A_001", 22L)).thenReturn(response);

        mockMvc.perform(post("/api/navigation/segment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                NavigationSegmentRequestDTO.builder()
                                        .startCode("QR_A_001")
                                        .targetId(22L)
                                        .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.isFinalSegment").value(true))
                .andExpect(jsonPath("$.data.segmentPoints[0].nodeCode").value("QR_A_001"));
    }

    @Test
    void buildSegmentShouldReturnBadRequestWhenStartCodeNotFound() throws Exception {
        NavigationSegmentResponseDTO response = NavigationSegmentResponseDTO.builder()
                .status("ERROR")
                .errorMessage("startCode not found: QR_MISSING")
                .build();

        when(navigationSegmentService.buildSegment("QR_MISSING", 22L)).thenReturn(response);

        mockMvc.perform(post("/api/navigation/segment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                NavigationSegmentRequestDTO.builder()
                                        .startCode("QR_MISSING")
                                        .targetId(22L)
                                        .build())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("startCode not found: QR_MISSING"));
    }

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
    @Test
    void getDestinationsShouldReturnFilteredNodes() throws Exception {
        NavigationDestinationDTO destination = NavigationDestinationDTO.builder()
                .nodeId(88L)
                .nodeCode("DEST-001")
                .nodeName("Gastro Clinic")
                .floor(2)
                .nodeType("CLINIC")
                .description("Second floor clinic")
                .recommended(true)
                .build();

        when(navigationDestinationService.findDestinations(2, "CLINIC", true))
                .thenReturn(List.of(destination));

        mockMvc.perform(get("/api/navigation/destinations")
                        .param("floor", "2")
                        .param("category", "CLINIC")
                        .param("recommended", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].nodeCode").value("DEST-001"))
                .andExpect(jsonPath("$.data[0].recommended").value(true));
    }

    @Test
    void saveRecentNavigationShouldReturnSavedRecord() throws Exception {
        RecentNavigationDTO saved = RecentNavigationDTO.builder()
                .userId(9L)
                .nodeId(88L)
                .nodeCode("DEST-001")
                .nodeName("Gastro Clinic")
                .floor(2)
                .nodeType("CLINIC")
                .description("Second floor clinic")
                .build();

        when(recentNavigationService.saveRecentNavigation(9L, 88L)).thenReturn(saved);

        mockMvc.perform(post("/api/navigation/recent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                RecentNavigationRequestDTO.builder()
                                        .userId(9L)
                                        .nodeId(88L)
                                        .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.userId").value(9))
                .andExpect(jsonPath("$.data.nodeCode").value("DEST-001"));
    }

    @Test
    void getRecentNavigationShouldReturnNotFoundWhenMissing() throws Exception {
        when(recentNavigationService.getRecentNavigations(9L, null)).thenReturn(List.of());

        mockMvc.perform(get("/api/navigation/recent/9"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    void getRecentNavigationShouldReturnRecentList() throws Exception {
        RecentNavigationDTO recent = RecentNavigationDTO.builder()
                .userId(9L)
                .nodeId(88L)
                .nodeCode("DEST-001")
                .nodeName("Gastro Clinic")
                .floor(2)
                .nodeType("CLINIC")
                .description("Second floor clinic")
                .build();

        when(recentNavigationService.getRecentNavigations(9L, 6)).thenReturn(List.of(recent));

        mockMvc.perform(get("/api/navigation/recent/9").param("limit", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].nodeCode").value("DEST-001"));
    }
}
