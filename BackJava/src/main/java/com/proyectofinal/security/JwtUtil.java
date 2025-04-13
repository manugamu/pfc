package com.proyectofinal.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private final String SECRET_KEY = "clave-secreta-ultrasegura-para-jwt-1234567890";

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    }

    public String generateToken(String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .setSubject(email)
            .setIssuedAt(new Date(now))
            .setExpiration(new Date(now + 1000 * 60 * 15)) // 15 minutos
            .setId(UUID.randomUUID().toString()) // jti
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }

    public String generateRefreshToken(String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .setSubject(email)
            .setIssuedAt(new Date(now))
            .setExpiration(new Date(now + 1000 * 60 * 60 * 24 * 7)) // 7 días
            .setId(UUID.randomUUID().toString()) // jti
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }

    
    public boolean validateToken(String token, String email) {
        return extractUsername(token).equals(email) && !isTokenExpired(token);
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public String extractJti(String token) {
        return extractClaims(token).getId(); // El jti se encuentra en el campo "jti"
    }

    
    public boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    public Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
