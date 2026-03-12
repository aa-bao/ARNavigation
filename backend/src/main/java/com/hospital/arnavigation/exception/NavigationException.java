package com.hospital.arnavigation.exception;

import lombok.Getter;

/**
 * 导航业务异常
 */
@Getter
public class NavigationException extends RuntimeException {

    private final Integer code;

    public NavigationException(String message) {
        super(message);
        this.code = 400;
    }

    public NavigationException(Integer code, String message) {
        super(message);
        this.code = code;
    }

    public NavigationException(String message, Throwable cause) {
        super(message, cause);
        this.code = 500;
    }

    public NavigationException(Integer code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }
}
