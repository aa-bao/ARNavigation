package com.hospital.arnavigation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class AdminOperationLogListResponse {
    private List<AdminOperationLogItemResponse> records;
    private Long total;
}
