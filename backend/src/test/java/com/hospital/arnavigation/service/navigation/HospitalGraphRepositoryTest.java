package com.hospital.arnavigation.service.navigation;

import com.hospital.arnavigation.entity.HospitalEdge;
import com.hospital.arnavigation.entity.HospitalNode;
import com.hospital.arnavigation.exception.NavigationException;
import com.hospital.arnavigation.mapper.HospitalEdgeMapper;
import com.hospital.arnavigation.mapper.HospitalNodeMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HospitalGraphRepositoryTest {

    @Mock
    private HospitalNodeMapper hospitalNodeMapper;

    @Mock
    private HospitalEdgeMapper hospitalEdgeMapper;

    @Test
    void loadGraphShouldRejectDuplicateNodeCodes() {
        HospitalNode first = new HospitalNode();
        first.setId(1L);
        first.setNodeCode("QR_DUP");
        first.setIsActive(1);

        HospitalNode second = new HospitalNode();
        second.setId(2L);
        second.setNodeCode("QR_DUP");
        second.setIsActive(1);

        when(hospitalNodeMapper.selectList(any())).thenReturn(List.of(first, second));
        HospitalGraphRepository repository = new HospitalGraphRepository(hospitalNodeMapper, hospitalEdgeMapper);

        assertThrows(NavigationException.class, repository::loadGraph);
    }
}
