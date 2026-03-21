package com.hospital.arnavigation.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hospital.arnavigation.dto.AdminRecentNavigationListResponse;
import com.hospital.arnavigation.dto.AdminRecentNavigationRecordDTO;
import com.hospital.arnavigation.dto.CurrentUserResponse;
import com.hospital.arnavigation.dto.RecentNavigationDTO;
import com.hospital.arnavigation.entity.AppUser;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.entity.UserRecentNavigation;
import com.hospital.arnavigation.exception.ForbiddenException;
import com.hospital.arnavigation.mapper.AppUserMapper;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.mapper.UserRecentNavigationMapper;
import com.hospital.arnavigation.service.RecentNavigationService;
import com.hospital.arnavigation.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecentNavigationServiceImpl implements RecentNavigationService {

    private static final int DEFAULT_LIMIT = 6;

    private final AppUserMapper appUserMapper;
    private final HospitalNodeMapper hospitalNodeMapper;
    private final UserRecentNavigationMapper recentNavigationMapper;
    private final UserService userService;

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

    @Override
    public AdminRecentNavigationListResponse listRecentNavigationsForAdmin(
            String authorizationHeader, Integer page, Integer pageSize, String keyword, Long userId) {
        requireAdmin(authorizationHeader);

        int safePage = page == null || page < 1 ? 1 : page;
        int safePageSize = pageSize == null || pageSize < 1 ? 20 : Math.min(pageSize, 100);

        LambdaQueryWrapper<UserRecentNavigation> wrapper = new LambdaQueryWrapper<UserRecentNavigation>()
                .orderByDesc(UserRecentNavigation::getLastNavigatedAt);
        if (userId != null && userId > 0) {
            wrapper.eq(UserRecentNavigation::getUserId, userId);
        }
        if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim();
            Set<Long> matchedUserIds = appUserMapper.selectList(
                            new LambdaQueryWrapper<AppUser>()
                                    .eq(AppUser::getDeleted, 0)
                                    .and(q -> q.like(AppUser::getUsername, kw)
                                            .or().like(AppUser::getNickname, kw)
                                            .or().like(AppUser::getPhone, kw)
                                            .or().like(AppUser::getOpenid, kw))
                    ).stream()
                    .map(AppUser::getId)
                    .collect(Collectors.toSet());
            wrapper.and(q -> q.like(UserRecentNavigation::getNodeName, kw)
                    .or().like(UserRecentNavigation::getNodeCode, kw)
                    .or().like(UserRecentNavigation::getDescription, kw)
                    .or(sub -> {
                        if (matchedUserIds.isEmpty()) {
                            sub.eq(UserRecentNavigation::getUserId, -1L);
                        } else {
                            sub.in(UserRecentNavigation::getUserId, matchedUserIds);
                        }
                    }));
        }

        List<UserRecentNavigation> all = recentNavigationMapper.selectList(wrapper);
        int fromIndex = Math.min((safePage - 1) * safePageSize, all.size());
        int toIndex = Math.min(fromIndex + safePageSize, all.size());
        List<UserRecentNavigation> pageRecords = all.subList(fromIndex, toIndex);

        Set<Long> userIds = pageRecords.stream()
                .map(UserRecentNavigation::getUserId)
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toSet());
        Map<Long, AppUser> userMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            List<AppUser> users = appUserMapper.selectBatchIds(userIds);
            for (AppUser user : users) {
                userMap.put(user.getId(), user);
            }
        }

        List<AdminRecentNavigationRecordDTO> records = pageRecords.stream()
                .map(record -> toAdminDto(record, userMap.get(record.getUserId())))
                .toList();
        return new AdminRecentNavigationListResponse(records, (long) all.size());
    }

    @Override
    public boolean deleteRecentNavigationForAdmin(String authorizationHeader, Long id) {
        requireAdmin(authorizationHeader);
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("记录ID无效");
        }
        return recentNavigationMapper.deleteById(id) > 0;
    }

    @Override
    public int deleteRecentNavigationsByUserForAdmin(String authorizationHeader, Long userId) {
        requireAdmin(authorizationHeader);
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("用户ID无效");
        }
        return recentNavigationMapper.delete(
                new LambdaQueryWrapper<UserRecentNavigation>()
                        .eq(UserRecentNavigation::getUserId, userId)
        );
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

    private AdminRecentNavigationRecordDTO toAdminDto(UserRecentNavigation record, AppUser user) {
        return AdminRecentNavigationRecordDTO.builder()
                .id(record.getId())
                .userId(record.getUserId())
                .username(user == null ? null : user.getUsername())
                .nickname(user == null ? null : user.getNickname())
                .nodeId(record.getNodeId())
                .nodeCode(record.getNodeCode())
                .nodeName(record.getNodeName())
                .floor(record.getFloor())
                .nodeType(record.getNodeType())
                .description(record.getDescription())
                .lastNavigatedAt(record.getLastNavigatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }

    private void requireAdmin(String authorizationHeader) {
        CurrentUserResponse user = userService.getCurrentUser(authorizationHeader);
        if (!"ADMIN".equals(user.getUserType())) {
            throw new ForbiddenException("无权限访问");
        }
    }
}
