package com.hospital.arnavigation.service;

import com.hospital.arnavigation.dto.NavigationDestinationDTO;

import java.util.List;

public interface NavigationDestinationService {

    List<NavigationDestinationDTO> findDestinations(Integer floor, String category, Boolean recommended);
}
