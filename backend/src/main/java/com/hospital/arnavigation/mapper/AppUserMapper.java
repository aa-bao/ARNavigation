package com.hospital.arnavigation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hospital.arnavigation.entity.AppUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AppUserMapper extends BaseMapper<AppUser> {

    @Select("SELECT * FROM app_user WHERE deleted = 0 AND username = #{username} LIMIT 1")
    AppUser selectByUsername(@Param("username") String username);

    @Select("SELECT * FROM app_user WHERE deleted = 0 AND openid = #{openid} LIMIT 1")
    AppUser selectByOpenid(@Param("openid") String openid);
}
