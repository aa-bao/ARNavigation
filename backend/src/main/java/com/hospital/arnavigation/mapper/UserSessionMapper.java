package com.hospital.arnavigation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hospital.arnavigation.entity.UserSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

@Mapper
public interface UserSessionMapper extends BaseMapper<UserSession> {

    @Select("SELECT * FROM user_session WHERE deleted = 0 AND token = #{token} AND expires_at > #{now} LIMIT 1")
    UserSession selectActiveByToken(@Param("token") String token, @Param("now") LocalDateTime now);

    @Update("UPDATE user_session SET deleted = 1 WHERE user_id = #{userId} AND deleted = 0")
    int softDeleteByUserId(@Param("userId") Long userId);
}
