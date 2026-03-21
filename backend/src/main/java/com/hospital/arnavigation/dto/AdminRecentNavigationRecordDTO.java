package com.hospital.arnavigation.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminRecentNavigationRecordDTO {

    private Long id;
    private Long userId;
    private String username;
    private String nickname;
    private Long nodeId;
    private String nodeCode;
    private String nodeName;
    private Integer floor;
    private String nodeType;
    private String description;
    private LocalDateTime lastNavigatedAt;
    private LocalDateTime updatedAt;
}
