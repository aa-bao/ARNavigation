package com.hospital.arnavigation.service;

import com.hospital.arnavigation.dto.RecentNavigationDTO;

import java.util.List;

public interface RecentNavigationService {

    RecentNavigationDTO saveRecentNavigation(Long userId, Long nodeId);

    List<RecentNavigationDTO> getRecentNavigations(Long userId, Integer limit);
}
