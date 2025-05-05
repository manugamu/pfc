package com.proyectofinal.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.proyectofinal.repository.UserRepository;
import com.proyectofinal.security.JwtAuthFilter;
import com.proyectofinal.security.JwtUtil;
import com.proyectofinal.service.RedisService;

@Configuration
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final RedisService redisService; 

    public SecurityConfig(JwtUtil jwtUtil, UserRepository userRepository, RedisService redisService) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.redisService = redisService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
              
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/users/register").permitAll()
                .requestMatchers("/api/users/profile-image/**").permitAll()
                .requestMatchers("/api/users/*").permitAll()
                .requestMatchers("/api/events", "/api/events/*").permitAll()
                .requestMatchers("/api/falla/codigo/**").permitAll()
                .anyRequest().authenticated()
            )
            
            .addFilterBefore(
                new JwtAuthFilter(jwtUtil, userRepository, redisService),
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
