package com.hospital.arnavigation.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    private final String avatarRootDir;

    public StaticResourceConfig(@Value("${app.upload.avatar-dir:uploads/avatars}") String avatarRootDir) {
        this.avatarRootDir = avatarRootDir;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadDir = Paths.get(avatarRootDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/avatars/**")
                .addResourceLocations(uploadDir.toUri().toString());
    }
}
