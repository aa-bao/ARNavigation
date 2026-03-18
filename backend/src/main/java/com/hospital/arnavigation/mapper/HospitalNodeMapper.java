package com.hospital.arnavigation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hospital.arnavigation.entity.HospitalNode;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface HospitalNodeMapper extends BaseMapper<HospitalNode> {

    /**
     * 根据节点编号查询节点列表
     * @param nodeCode 节点编号
     * @return 节点列表
     */
    @Select("SELECT * FROM hospital_nodes WHERE node_code = #{nodeCode} AND is_active = 1")
    List<HospitalNode> selectByNodeCode(@Param("nodeCode") String nodeCode);

    @Select("SELECT * FROM hospital_nodes WHERE node_name = #{nodeName} AND is_active = 1")
    List<HospitalNode> selectByNodeName(@Param("nodeName") String nodeName);
}
