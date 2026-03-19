package com.hospital.arnavigation.dto;

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
public class RecentNavigationRequestDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    @NotNull(message = "userId cannot be null")
    private Long userId;

    @NotNull(message = "nodeId cannot be null")
    private Long nodeId;
}
