package com.hospital.arnavigation.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hospital.arnavigation.dto.NavigationDestinationDTO;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.service.NavigationDestinationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NavigationDestinationServiceImpl implements NavigationDestinationService {

    private static final Set<String> RECOMMENDED_TYPES = Set.of(
            "ENTRANCE",
            "REGISTRATION",
            "CLINIC",
            "EXAMINATION",
            "PHARMACY",
            "NURSE_STATION",
            "ROOM",
            "RESTROOM"
    );

    private final HospitalNodeMapper hospitalNodeMapper;

    @Override
    public List<NavigationDestinationDTO> findDestinations(Integer floor, String category, Boolean recommended) {
        List<HospitalNode> nodes = hospitalNodeMapper.selectList(
                new LambdaQueryWrapper<HospitalNode>()
                        .eq(HospitalNode::getIsActive, 1)
                        .orderByAsc(HospitalNode::getFloor)
                        .orderByAsc(HospitalNode::getNodeName)
        );

        if (nodes == null || nodes.isEmpty()) {
            return List.of();
        }

        return nodes.stream()
                .filter(node -> floor == null || floor.equals(node.getFloor()))
                .filter(node -> category == null || category.isBlank() || matchesCategory(node, category))
                .filter(node -> recommended == null || Boolean.TRUE.equals(recommended) == isRecommended(node))
                .map(node -> toDestinationDto(node, isRecommended(node)))
                .sorted(Comparator
                        .comparing((NavigationDestinationDTO dto) -> Boolean.TRUE.equals(dto.getRecommended()))
                        .reversed()
                        .thenComparing(NavigationDestinationDTO::getFloor, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(NavigationDestinationDTO::getNodeName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
    }

    private boolean matchesCategory(HospitalNode node, String category) {
        return node.getNodeType() != null
                && node.getNodeType().equalsIgnoreCase(category.trim());
    }

    private boolean isRecommended(HospitalNode node) {
        String nodeType = node.getNodeType();
        if (nodeType == null) {
            return false;
        }
        return RECOMMENDED_TYPES.contains(nodeType.trim().toUpperCase(Locale.ROOT));
    }

    private NavigationDestinationDTO toDestinationDto(HospitalNode node, boolean recommended) {
        return NavigationDestinationDTO.builder()
                .nodeId(node.getId())
                .nodeCode(node.getNodeCode())
                .nodeName(node.getNodeName())
                .floor(node.getFloor())
                .nodeType(node.getNodeType())
                .description(node.getDescription())
                .recommended(recommended)
                .build();
    }
}
