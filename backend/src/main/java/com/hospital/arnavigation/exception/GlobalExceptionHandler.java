package com.hospital.arnavigation.exception;

import com.hospital.arnavigation.common.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NavigationException.class)
    public ResponseEntity<Result<Void>> handleNavigationException(NavigationException e) {
        log.warn("业务异常: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Result.error(e.getCode(), e.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Result<Void>> handleUnauthorizedException(UnauthorizedException e) {
        log.warn("未授权访问: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Result.error(401, e.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Result<Void>> handleForbiddenException(ForbiddenException e) {
        log.warn("无权限访问: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Result.error(403, e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Result<Void>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("请求参数错误: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Result.error(400, e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Map<String, String>>> handleValidationException(MethodArgumentNotValidException e) {
        Map<String, String> errors = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fieldError -> fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "参数错误",
                        (existing, replacement) -> existing + "; " + replacement
                ));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Result.<Map<String, String>>builder()
                        .code(400)
                        .message("请求参数错误")
                        .data(errors)
                        .timestamp(System.currentTimeMillis())
                        .build());
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<Result<Map<String, String>>> handleBindException(BindException e) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : e.getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Result.<Map<String, String>>builder()
                        .code(400)
                        .message("参数绑定失败")
                        .data(errors)
                        .timestamp(System.currentTimeMillis())
                        .build());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Result<Void>> handleMissingParam(MissingServletRequestParameterException e) {
        String message = String.format("缺少必需参数: %s (%s)", e.getParameterName(), e.getParameterType());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Result.error(400, message));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Result<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        String message = String.format("参数类型错误: %s 应为 %s", e.getName(),
                e.getRequiredType() != null ? e.getRequiredType().getSimpleName() : "未知");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Result.error(400, message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Result<Void>> handleNotReadable(HttpMessageNotReadableException e) {
        log.warn("请求体解析失败: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Result.error(400, "请求体格式错误，请检查 JSON"));
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Result<Void>> handleNotFound(NoHandlerFoundException e) {
        log.warn("请求路径不存在: {} {}", e.getHttpMethod(), e.getRequestURL());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Result.error(404, "请求的资源不存在"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleAll(Exception e) {
        log.error("系统异常: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.error(500, "系统内部错误，请联系管理员"));
    }
}
