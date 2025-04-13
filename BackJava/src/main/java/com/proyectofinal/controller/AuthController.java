package com.proyectofinal.controller;

import com.proyectofinal.dto.LoginRequest;
import com.proyectofinal.model.User;
import com.proyectofinal.model.User.RefreshTokenInfo;
import com.proyectofinal.repository.UserRepository;
import com.proyectofinal.security.JwtUtil;
import com.proyectofinal.service.RedisService;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private RedisService redisService;

  
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Optional<User> userOpt = userRepository.findByEmail(loginRequest.getEmail());

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            boolean matches = passwordEncoder.matches(loginRequest.getPassword(), user.getPassword());

            if (matches) {
                String accessToken = jwtUtil.generateToken(user.getEmail());
                String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());
                String deviceId = loginRequest.getDeviceId();

                user.getRefreshTokens().removeIf(rt -> deviceId.equals(rt.getDeviceId()));
                user.getRefreshTokens().add(new RefreshTokenInfo(deviceId, refreshToken));
                userRepository.save(user);

                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId()); 
                response.put("username", user.getUsername());
                response.put("accessToken", accessToken);
                response.put("refreshToken", refreshToken);
                response.put("profileImageUrl", user.getProfileImageUrl() != null ? user.getProfileImageUrl() : "");


                return ResponseEntity.ok(response);
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User newUser) {
        if (userRepository.findByEmail(newUser.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("El usuario ya existe");
        }

        newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));
        userRepository.save(newUser);
        return ResponseEntity.ok("Usuario registrado correctamente");
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        String deviceId = request.get("deviceId");

        Optional<User> userOpt = userRepository.findAll().stream()
            .filter(u -> u.getRefreshTokens().stream()
                .anyMatch(rt -> rt.getToken().equals(refreshToken) && deviceId.equals(rt.getDeviceId())))
            .findFirst();

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            if (!jwtUtil.validateToken(refreshToken, user.getEmail())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Refresh token inválido o expirado");
            }

            String newAccessToken = jwtUtil.generateToken(user.getEmail());
            String newRefreshToken = jwtUtil.generateRefreshToken(user.getEmail());

            user.getRefreshTokens().removeIf(rt -> deviceId.equals(rt.getDeviceId()));
            user.getRefreshTokens().add(new RefreshTokenInfo(deviceId, newRefreshToken));
            userRepository.save(user);

            Map<String, String> response = new HashMap<>();
            response.put("accessToken", newAccessToken);
            response.put("refreshToken", newRefreshToken);
            response.put("username", user.getUsername());
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Refresh token no reconocido");
    }

    // LOGOUT Token Blacklist con Redis
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String jti = jwtUtil.extractJti(token);
            long expirationTime = jwtUtil.extractClaims(token).getExpiration().getTime() - System.currentTimeMillis();

            redisService.saveTokenToBlacklist(jti, expirationTime);
        }

        return ResponseEntity.ok("Sesión cerrada correctamente");
    }
    
    @PostMapping("/logout-device")
    public ResponseEntity<?> logoutDevice(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String deviceId = request.get("deviceId");

        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Token no proporcionado");
        }

        String token = authHeader.substring(7);
        String email = jwtUtil.extractUsername(token);

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // 1. Eliminar el refresh token para ese dispositivo
            user.getRefreshTokens().removeIf(rt -> deviceId.equals(rt.getDeviceId()));
            userRepository.save(user);

            // 2. Blacklistear el access token actual
            String jti = jwtUtil.extractJti(token);
            long expTime = jwtUtil.extractClaims(token).getExpiration().getTime() - System.currentTimeMillis();
            redisService.saveTokenToBlacklist(jti, expTime);

            return ResponseEntity.ok("Dispositivo desconectado correctamente");
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
    }
}
