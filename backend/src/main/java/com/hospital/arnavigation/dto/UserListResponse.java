package com.hospital.arnavigation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserListResponse {
    private List<UserListItemResponse> records;
    private Long total;
}
