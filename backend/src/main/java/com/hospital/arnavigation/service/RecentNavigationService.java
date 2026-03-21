package com.hospital.arnavigation.service;

import com.hospital.arnavigation.dto.RecentNavigationDTO;
import com.hospital.arnavigation.dto.AdminRecentNavigationListResponse;

import java.util.List;

public interface RecentNavigationService {

    RecentNavigationDTO saveRecentNavigation(Long userId, Long nodeId);

    List<RecentNavigationDTO> getRecentNavigations(Long userId, Integer limit);

    AdminRecentNavigationListResponse listRecentNavigationsForAdmin(
            String authorizationHeader, Integer page, Integer pageSize, String keyword, Long userId);

    boolean deleteRecentNavigationForAdmin(String authorizationHeader, Long id);

    int deleteRecentNavigationsByUserForAdmin(String authorizationHeader, Long userId);
}
