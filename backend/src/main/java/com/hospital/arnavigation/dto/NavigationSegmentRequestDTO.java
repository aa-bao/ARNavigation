package com.hospital.arnavigation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NavigationSegmentRequestDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    @NotBlank(message = "startCode cannot be blank")
    private String startCode;

    @NotNull(message = "targetId cannot be null")
    private Long targetId;
}
