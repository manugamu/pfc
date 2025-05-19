package com.proyectofinal.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class RedisService {

    @Autowired
    private StringRedisTemplate redisTemplate;

    public void saveTokenToBlacklist(String jti, long expirationMillis) {
        redisTemplate.opsForValue().set(jti, "revoked", expirationMillis, TimeUnit.MILLISECONDS);
    }

    public boolean isTokenRevoked(String jti) {
        return redisTemplate.hasKey(jti);
    }
}
