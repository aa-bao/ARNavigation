package com.hospital.arnavigation.dto;

import lombok.Data;

@Data
public class UserUpdateRequest {
    private String nickname;
    private String avatarUrl;
    private String phone;
    private String userType;
    private String password;
    private String status;
}
