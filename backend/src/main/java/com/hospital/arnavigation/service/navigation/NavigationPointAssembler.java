package com.hospital.arnavigation.service.navigation;

import com.hospital.arnavigation.dto.NavigationNodeDTO;
import com.hospital.arnavigation.dto.NavigationPointDTO;
import com.hospital.arnavigation.entity.HospitalNode;
import org.springframework.stereotype.Component;

@Component
public class NavigationPointAssembler {

    public NavigationNodeDTO toNodeDto(HospitalNode node) {
        if (node == null) {
            return null;
        }

        return NavigationNodeDTO.builder()
                .nodeId(node.getId())
                .nodeCode(node.getNodeCode())
                .nodeName(node.getNodeName())
                .floor(node.getFloor())
                .nodeType(node.getNodeType())
                .description(node.getDescription())
                .planarX(node.getXCoordinate())
                .planarY(node.getYCoordinate())
                .worldX(node.getXCoordinate())
                .worldY(normalizeWorldY(node.getFloor()))
                .worldZ(node.getYCoordinate())
                .build();
    }

    public NavigationPointDTO toPointDto(HospitalNode node) {
        if (node == null) {
            return null;
        }

        return NavigationPointDTO.builder()
                .nodeId(node.getId())
                .nodeCode(node.getNodeCode())
                .nodeName(node.getNodeName())
                .floor(node.getFloor())
                .nodeType(node.getNodeType())
                .description(node.getDescription())
                .planarX(node.getXCoordinate())
                .planarY(node.getYCoordinate())
                .worldX(node.getXCoordinate())
                .worldY(normalizeWorldY(node.getFloor()))
                .worldZ(node.getYCoordinate())
                .build();
    }

    public Double normalizeWorldY(Integer floor) {
        return floor == null ? null : floor * 4.5d;
    }
}
