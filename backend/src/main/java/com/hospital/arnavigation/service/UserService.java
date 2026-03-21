package com.hospital.arnavigation.service;

import com.hospital.arnavigation.dto.AdminLoginRequest;
import com.hospital.arnavigation.dto.AvatarUploadResponse;
import com.hospital.arnavigation.dto.CurrentUserResponse;
import com.hospital.arnavigation.dto.LoginResponse;
import com.hospital.arnavigation.dto.PasswordResetRequest;
import com.hospital.arnavigation.dto.UserAvatarUpdateRequest;
import com.hospital.arnavigation.dto.UserCreateRequest;
import com.hospital.arnavigation.dto.UserListItemResponse;
import com.hospital.arnavigation.dto.UserListResponse;
import com.hospital.arnavigation.dto.UserStatusUpdateRequest;
import com.hospital.arnavigation.dto.UserUpdateRequest;
import com.hospital.arnavigation.dto.WechatLoginRequest;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {

    LoginResponse adminLogin(AdminLoginRequest request);

    LoginResponse wechatLogin(WechatLoginRequest request);

    CurrentUserResponse getCurrentUser(String authorizationHeader);

    AvatarUploadResponse uploadAvatar(String authorizationHeader, MultipartFile file);

    CurrentUserResponse updateCurrentUserAvatar(String authorizationHeader, UserAvatarUpdateRequest request);

    void logout(String authorizationHeader);

    UserListResponse listUsers(String authorizationHeader, Integer page, Integer pageSize, String keyword, String userType, String status);

    UserListItemResponse createUser(String authorizationHeader, UserCreateRequest request);

    UserListItemResponse updateUser(String authorizationHeader, Long id, UserUpdateRequest request);

    UserListItemResponse updateUserStatus(String authorizationHeader, Long id, UserStatusUpdateRequest request);

    void resetPassword(String authorizationHeader, Long id, PasswordResetRequest request);

    void deleteUser(String authorizationHeader, Long id);
}
