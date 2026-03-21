package com.hospital.arnavigation.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.hospital.arnavigation.dto.AdminOperationLogCreateRequest;
import com.hospital.arnavigation.dto.AdminOperationLogItemResponse;
import com.hospital.arnavigation.dto.AdminOperationLogListResponse;
import com.hospital.arnavigation.dto.CurrentUserResponse;
import com.hospital.arnavigation.entity.AdminOperationLog;
import com.hospital.arnavigation.exception.ForbiddenException;
import com.hospital.arnavigation.mapper.AdminOperationLogMapper;
import com.hospital.arnavigation.service.AdminOperationLogService;
import com.hospital.arnavigation.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminOperationLogServiceImpl implements AdminOperationLogService {

    private static final String USER_TYPE_ADMIN = "ADMIN";

    private final AdminOperationLogMapper adminOperationLogMapper;
    private final UserService userService;

    @Override
    @Transactional
    public AdminOperationLogItemResponse createLog(String authorizationHeader, AdminOperationLogCreateRequest request) {
        CurrentUserResponse operator = requireAdmin(authorizationHeader);
        if (isBlank(request.getModule()) || isBlank(request.getAction())) {
            throw new IllegalArgumentException("module 和 action 不能为空");
        }

        AdminOperationLog log = new AdminOperationLog();
        log.setOperatorUserId(operator.getId());
        log.setOperatorName(resolveOperatorName(operator));
        log.setModule(request.getModule().trim().toLowerCase());
        log.setAction(request.getAction().trim());
        log.setTarget(trimToNull(request.getTarget()));
        log.setDetail(trimToNull(request.getDetail()));
        log.setIp(trimToNull(request.getIp()));
        log.setUserAgent(trimToNull(request.getUserAgent()));
        log.setDeleted(0);
        adminOperationLogMapper.insert(log);

        return toItem(log);
    }

    @Override
    public AdminOperationLogListResponse listLogs(
            String authorizationHeader,
            Integer page,
            Integer pageSize,
            String module,
            String keyword,
            String startTime,
            String endTime) {
        requireAdmin(authorizationHeader);

        int safePage = page == null || page < 1 ? 1 : page;
        int safePageSize = pageSize == null || pageSize < 1 ? 20 : Math.min(pageSize, 200);

        LambdaQueryWrapper<AdminOperationLog> wrapper = new LambdaQueryWrapper<AdminOperationLog>()
                .eq(AdminOperationLog::getDeleted, 0)
                .orderByDesc(AdminOperationLog::getCreatedAt);

        if (!isBlank(module)) {
            wrapper.eq(AdminOperationLog::getModule, module.trim().toLowerCase());
        }
        if (!isBlank(keyword)) {
            String kw = keyword.trim();
            wrapper.and(q -> q.like(AdminOperationLog::getAction, kw)
                    .or().like(AdminOperationLog::getTarget, kw)
                    .or().like(AdminOperationLog::getDetail, kw)
                    .or().like(AdminOperationLog::getOperatorName, kw));
        }

        LocalDateTime start = parseDateTime(startTime);
        LocalDateTime end = parseDateTime(endTime);
        if (start != null) {
            wrapper.ge(AdminOperationLog::getCreatedAt, start);
        }
        if (end != null) {
            wrapper.le(AdminOperationLog::getCreatedAt, end);
        }

        List<AdminOperationLog> all = adminOperationLogMapper.selectList(wrapper);
        int fromIndex = Math.min((safePage - 1) * safePageSize, all.size());
        int toIndex = Math.min(fromIndex + safePageSize, all.size());

        List<AdminOperationLogItemResponse> records = all.subList(fromIndex, toIndex)
                .stream()
                .map(this::toItem)
                .toList();

        return new AdminOperationLogListResponse(records, (long) all.size());
    }

    @Override
    @Transactional
    public void clearLogs(String authorizationHeader) {
        requireAdmin(authorizationHeader);
        adminOperationLogMapper.update(
                null,
                new LambdaUpdateWrapper<AdminOperationLog>()
                        .eq(AdminOperationLog::getDeleted, 0)
                        .set(AdminOperationLog::getDeleted, 1)
        );
    }

    private CurrentUserResponse requireAdmin(String authorizationHeader) {
        CurrentUserResponse operator = userService.getCurrentUser(authorizationHeader);
        if (!USER_TYPE_ADMIN.equals(operator.getUserType())) {
            throw new ForbiddenException("无权限访问");
        }
        return operator;
    }

    private String resolveOperatorName(CurrentUserResponse operator) {
        if (!isBlank(operator.getNickname())) {
            return operator.getNickname().trim();
        }
        if (!isBlank(operator.getUsername())) {
            return operator.getUsername().trim();
        }
        return "管理员";
    }

    private AdminOperationLogItemResponse toItem(AdminOperationLog log) {
        return new AdminOperationLogItemResponse(
                log.getId(),
                log.getOperatorUserId(),
                log.getOperatorName(),
                log.getModule(),
                log.getAction(),
                log.getTarget(),
                log.getDetail(),
                log.getIp(),
                log.getUserAgent(),
                log.getCreatedAt()
        );
    }

    private LocalDateTime parseDateTime(String raw) {
        if (isBlank(raw)) {
            return null;
        }
        String value = raw.trim();
        try {
            if (value.matches("^\\d+$")) {
                long millis = Long.parseLong(value);
                return LocalDateTime.ofInstant(Instant.ofEpochMilli(millis), ZoneId.systemDefault());
            }
            return LocalDateTime.parse(value.replace(" ", "T"));
        } catch (DateTimeParseException | NumberFormatException ex) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }
}
