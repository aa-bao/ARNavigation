package com.hospital.arnavigation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserListItemResponse {
    private Long id;
    private String username;
    private String nickname;
    private String avatarUrl;
    private String phone;
    private String openid;
    private String userType;
    private String status;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
}
