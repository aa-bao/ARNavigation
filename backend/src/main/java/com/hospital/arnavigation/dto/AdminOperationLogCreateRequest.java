package com.hospital.arnavigation.dto;

import lombok.Data;

@Data
public class AdminOperationLogCreateRequest {
    private String module;
    private String action;
    private String target;
    private String detail;
    private String ip;
    private String userAgent;
}
