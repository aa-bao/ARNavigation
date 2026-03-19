package com.hospital.arnavigation.service;

import com.hospital.arnavigation.dto.NavigationDestinationDTO;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import com.hospital.arnavigation.service.impl.NavigationDestinationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NavigationDestinationServiceTest {

    @Mock
    private HospitalNodeMapper hospitalNodeMapper;

    @Test
    void findDestinationsShouldFilterAndMarkRecommendedNodes() {
        HospitalNode clinic = new HospitalNode();
        clinic.setId(1L);
        clinic.setNodeCode("CLINIC-01");
        clinic.setNodeName("Clinic A");
        clinic.setFloor(2);
        clinic.setNodeType("CLINIC");
        clinic.setDescription("Clinic on floor 2");
        clinic.setIsActive(1);

        HospitalNode elevator = new HospitalNode();
        elevator.setId(2L);
        elevator.setNodeCode("ELEV-01");
        elevator.setNodeName("Elevator");
        elevator.setFloor(2);
        elevator.setNodeType("ELEVATOR");
        elevator.setDescription("Lift");
        elevator.setIsActive(1);

        HospitalNode room = new HospitalNode();
        room.setId(3L);
        room.setNodeCode("ROOM-01");
        room.setNodeName("Room");
        room.setFloor(1);
        room.setNodeType("ROOM");
        room.setDescription("Room on floor 1");
        room.setIsActive(1);

        when(hospitalNodeMapper.selectList(any())).thenReturn(List.of(clinic, elevator, room));

        NavigationDestinationService service = new NavigationDestinationServiceImpl(hospitalNodeMapper);

        List<NavigationDestinationDTO> result = service.findDestinations(2, "CLINIC", true);

        assertEquals(1, result.size());
        assertEquals("CLINIC-01", result.get(0).getNodeCode());
        assertTrue(result.get(0).getRecommended());
    }
}
