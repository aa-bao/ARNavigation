package com.hospital.arnavigation.dto;

import lombok.Data;

@Data
public class WechatLoginRequest {
    private String code;
    private String nickname;
    private String avatarUrl;
    private String encryptedData;
    private String iv;
}
