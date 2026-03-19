package com.hospital.arnavigation.service;

import com.hospital.arnavigation.dto.RecentNavigationDTO;
import com.hospital.arnavigation.entity.AppUser;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.entity.UserRecentNavigation;
import com.hospital.arnavigation.mapper.AppUserMapper;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.mapper.UserRecentNavigationMapper;
import com.hospital.arnavigation.service.impl.RecentNavigationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecentNavigationServiceTest {

    @Mock
    private AppUserMapper appUserMapper;

    @Mock
    private HospitalNodeMapper hospitalNodeMapper;

    @Mock
    private UserRecentNavigationMapper recentNavigationMapper;

    @Test
    void saveRecentNavigationShouldInsertRecordForNewUserHistory() {
        AppUser user = new AppUser();
        user.setId(7L);
        user.setDeleted(0);

        HospitalNode node = new HospitalNode();
        node.setId(88L);
        node.setNodeCode("DEST-001");
        node.setNodeName("Clinic A");
        node.setFloor(2);
        node.setNodeType("CLINIC");
        node.setDescription("Clinic on floor 2");
        node.setIsActive(1);

        when(appUserMapper.selectById(7L)).thenReturn(user);
        when(hospitalNodeMapper.selectById(88L)).thenReturn(node);
        when(recentNavigationMapper.selectById(7L)).thenReturn(null);
        when(recentNavigationMapper.insert(org.mockito.ArgumentMatchers.any(UserRecentNavigation.class)))
                .thenReturn(1);

        RecentNavigationService service = new RecentNavigationServiceImpl(
                appUserMapper,
                hospitalNodeMapper,
                recentNavigationMapper
        );

        RecentNavigationDTO result = service.saveRecentNavigation(7L, 88L);

        assertNotNull(result);
        assertEquals(7L, result.getUserId());
        assertEquals("DEST-001", result.getNodeCode());

        ArgumentCaptor<UserRecentNavigation> captor = ArgumentCaptor.forClass(UserRecentNavigation.class);
        verify(recentNavigationMapper).insert(captor.capture());
    }

    @Test
    void getRecentNavigationShouldReturnLatestRecord() {
        UserRecentNavigation record = new UserRecentNavigation();
        record.setUserId(7L);
        record.setNodeId(88L);
        record.setNodeCode("DEST-001");
        record.setNodeName("Clinic A");
        record.setFloor(2);
        record.setNodeType("CLINIC");
        record.setDescription("Clinic on floor 2");
        record.setLastNavigatedAt(LocalDateTime.now());

        when(recentNavigationMapper.selectById(7L)).thenReturn(record);

        RecentNavigationService service = new RecentNavigationServiceImpl(
                appUserMapper,
                hospitalNodeMapper,
                recentNavigationMapper
        );

        // RecentNavigationDTO result = service.getRecentNavigation(7L);

        assertNotNull(result);
        assertEquals(88L, result.getNodeId());
    }
}
