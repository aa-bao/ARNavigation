package com.hospital.arnavigation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hospital.arnavigation.entity.HospitalEdge;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface HospitalEdgeMapper extends BaseMapper<HospitalEdge> {

    /**
     * 根据起始节点ID查询边列表
     * @param fromNodeId 起始节点ID
     * @return 边列表
     */
    @Select("SELECT * FROM hospital_edges WHERE from_node_id = #{fromNodeId}")
    List<HospitalEdge> selectByFromNodeId(@Param("fromNodeId") Long fromNodeId);
}
