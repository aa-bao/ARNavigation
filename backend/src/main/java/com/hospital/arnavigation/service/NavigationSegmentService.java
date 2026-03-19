package com.hospital.arnavigation.service;

import com.hospital.arnavigation.dto.NavigationNodeDTO;
import com.hospital.arnavigation.dto.NavigationSegmentResponseDTO;

public interface NavigationSegmentService {

    NavigationNodeDTO findNormalizedNodeByCode(String nodeCode);

    NavigationSegmentResponseDTO buildSegment(String startCode, Long targetId);
}
