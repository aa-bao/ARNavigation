package com.hospital.arnavigation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class AdminOperationLogItemResponse {
    private Long id;
    private Long operatorUserId;
    private String operatorName;
    private String module;
    private String action;
    private String target;
    private String detail;
    private String ip;
    private String userAgent;
    private LocalDateTime createdAt;
}
