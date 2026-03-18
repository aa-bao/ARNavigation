package com.hospital.arnavigation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CurrentUserResponse {
    private Long id;
    private String username;
    private String nickname;
    private String avatarUrl;
    private String phone;
    private String userType;
    private String status;
}
