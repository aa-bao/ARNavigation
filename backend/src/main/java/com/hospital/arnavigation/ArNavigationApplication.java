package com.hospital.arnavigation;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.hospital.arnavigation.mapper")
public class ArNavigationApplication {

    public static void main(String[] args) {
        SpringApplication.run(ArNavigationApplication.class, args);
        System.out.println("================================================");
        System.out.println("访问地址: http://localhost:8080");
        System.out.println("API文档: http://localhost:8080/swagger-ui.html");
        System.out.println("管理员：admin");
        System.out.println("密码：123456");
        System.out.println("================================================\n");
    }
}
