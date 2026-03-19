package com.hospital.arnavigation.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hospital.arnavigation.dto.RecentNavigationDTO;
import com.hospital.arnavigation.entity.AppUser;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.entity.UserRecentNavigation;
import com.hospital.arnavigation.mapper.AppUserMapper;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.mapper.UserRecentNavigationMapper;
import com.hospital.arnavigation.service.RecentNavigationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecentNavigationServiceImpl implements RecentNavigationService {

    private static final int DEFAULT_LIMIT = 6;

    private final AppUserMapper appUserMapper;
    private final HospitalNodeMapper hospitalNodeMapper;
    private final UserRecentNavigationMapper recentNavigationMapper;

    @Override
    public RecentNavigationDTO saveRecentNavigation(Long userId, Long nodeId) {
        if (userId == null || nodeId == null) {
            return null;
        }

        AppUser user = appUserMapper.selectById(userId);
        HospitalNode node = hospitalNodeMapper.selectById(nodeId);
        if (user == null || node == null || node.getIsActive() == null || node.getIsActive() == 0) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        UserRecentNavigation record = recentNavigationMapper.selectOne(
                new LambdaQueryWrapper<UserRecentNavigation>()
                        .eq(UserRecentNavigation::getUserId, userId)
                        .eq(UserRecentNavigation::getNodeId, nodeId)
                        .last("LIMIT 1")
        );
        boolean exists = record != null;
        if (!exists) {
            record = new UserRecentNavigation();
            record.setUserId(userId);
            record.setCreatedAt(now);
        }

        record.setNodeId(node.getId());
        record.setNodeCode(node.getNodeCode());
        record.setNodeName(node.getNodeName());
        record.setFloor(node.getFloor());
        record.setNodeType(node.getNodeType());
        record.setDescription(node.getDescription());
        record.setLastNavigatedAt(now);
        record.setUpdatedAt(now);

        if (record.getCreatedAt() == null) {
            record.setCreatedAt(now);
        }

        if (!exists) {
            recentNavigationMapper.insert(record);
        } else {
            recentNavigationMapper.updateById(record);
        }

        return toDto(record);
    }

    @Override
    public List<RecentNavigationDTO> getRecentNavigations(Long userId, Integer limit) {
        if (userId == null) {
            return List.of();
        }

        int safeLimit = limit == null || limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, 20);
        return recentNavigationMapper.selectList(
                new LambdaQueryWrapper<UserRecentNavigation>()
                        .eq(UserRecentNavigation::getUserId, userId)
                        .orderByDesc(UserRecentNavigation::getLastNavigatedAt)
                        .last("LIMIT " + safeLimit)
        ).stream().map(this::toDto).toList();
    }

    private RecentNavigationDTO toDto(UserRecentNavigation record) {
        return RecentNavigationDTO.builder()
                .userId(record.getUserId())
                .nodeId(record.getNodeId())
                .nodeCode(record.getNodeCode())
                .nodeName(record.getNodeName())
                .floor(record.getFloor())
                .nodeType(record.getNodeType())
                .description(record.getDescription())
                .lastNavigatedAt(record.getLastNavigatedAt())
                .build();
    }
}
