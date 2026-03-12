package com.hospital.arnavigation.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 通用响应结果封装类
 * @param <T> 数据类型
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 响应码
     * 200 - 成功
     * 400 - 请求参数错误
     * 404 - 资源不存在
     * 500 - 服务器内部错误
     */
    private Integer code;

    /**
     * 响应消息
     */
    private String message;

    /**
     * 响应数据
     */
    private T data;

    /**
     * 时间戳
     */
    private Long timestamp;

    /**
     * 成功响应（无数据）
     * @return Result
     */
    public static <T> Result<T> success() {
        return success(null);
    }

    /**
     * 成功响应（带数据）
     * @param data 数据
     * @return Result
     */
    public static <T> Result<T> success(T data) {
        return Result.<T>builder()
                .code(200)
                .message("success")
                .data(data)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * 成功响应（带数据和自定义消息）
     * @param data 数据
     * @param message 消息
     * @return Result
     */
    public static <T> Result<T> success(T data, String message) {
        return Result.<T>builder()
                .code(200)
                .message(message)
                .data(data)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * 错误响应
     * @param code 错误码
     * @param message 错误消息
     * @return Result
     */
    public static <T> Result<T> error(Integer code, String message) {
        return Result.<T>builder()
                .code(code)
                .message(message)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * 400 - 请求参数错误
     * @param message 错误消息
     * @return Result
     */
    public static <T> Result<T> badRequest(String message) {
        return error(400, message);
    }

    /**
     * 404 - 资源不存在
     * @param message 错误消息
     * @return Result
     */
    public static <T> Result<T> notFound(String message) {
        return error(404, message);
    }

    /**
     * 500 - 服务器内部错误
     * @param message 错误消息
     * @return Result
     */
    public static <T> Result<T> serverError(String message) {
        return error(500, message);
    }

    /**
     * 判断响应是否成功
     * @return true - 成功
     */
    public boolean isSuccess() {
        return code != null && code == 200;
    }
}
