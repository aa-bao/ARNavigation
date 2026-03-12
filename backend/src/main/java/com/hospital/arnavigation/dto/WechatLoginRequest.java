package com.hospital.arnavigation.dto;

import lombok.Data;

/**
 * 微信小程序登录请求
 */
@Data
public class WechatLoginRequest {
    /**
     * 微信登录凭证
     */
    private String code;

    /**
     * 用户信息（可选，需要用户授权）
     */
    private String encryptedData;

    /**
     * 加密算法的初始向量
     */
    private String iv;
}
