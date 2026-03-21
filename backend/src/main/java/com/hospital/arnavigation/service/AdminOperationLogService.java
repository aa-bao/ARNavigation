package com.hospital.arnavigation.service;

import com.hospital.arnavigation.dto.AdminOperationLogCreateRequest;
import com.hospital.arnavigation.dto.AdminOperationLogItemResponse;
import com.hospital.arnavigation.dto.AdminOperationLogListResponse;

public interface AdminOperationLogService {

    AdminOperationLogItemResponse createLog(String authorizationHeader, AdminOperationLogCreateRequest request);

    AdminOperationLogListResponse listLogs(
            String authorizationHeader,
            Integer page,
            Integer pageSize,
            String module,
            String keyword,
            String startTime,
            String endTime);

    void clearLogs(String authorizationHeader);
}
