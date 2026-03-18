package com.hospital.arnavigation.dto;

import lombok.Data;

@Data
public class UserCreateRequest {
    private String username;
    private String password;
    private String nickname;
    private String avatarUrl;
    private String phone;
    private String userType;
    private String status;
}
