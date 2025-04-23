package com.proyectofinal.controller;

import com.proyectofinal.model.User;
import com.proyectofinal.repository.UserRepository;
import com.proyectofinal.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody User loginUser) {
        boolean isValid = userService.checkCredentials(loginUser.getEmail(), loginUser.getPassword());
        if (isValid) {
            return ResponseEntity.ok("Login correcto");
        } else {
            return ResponseEntity.status(401).body("Credenciales inválidas");
        }
    }

    @PutMapping("/profile-image")
    public ResponseEntity<?> updateProfileImage(@RequestBody Map<String, String> request, Authentication auth) {
        String email = auth.getName();
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String profileImageUrl = request.get("profileImageUrl");

            user.setProfileImageUrl(profileImageUrl);
            userRepository.save(user);

            try {
                RestTemplate restTemplate = new RestTemplate();
                Map<String, String> payload = new HashMap<>();
                payload.put("userId", user.getId());
                payload.put("newProfileImageUrl", profileImageUrl);

                String nodeChatUrl = "http://localhost:4000/api/chat/update-profile-image";
                restTemplate.put(nodeChatUrl, payload);
                System.out.println("Notificación de actualización enviada al servidor de chat.");
            } catch (Exception e) {
                System.err.println("Error al notificar el cambio de imagen al servidor de chat: " + e.getMessage());
            }
            return ResponseEntity.ok("Foto de perfil actualizada");
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody User newUser) {
        if (userService.findByEmail(newUser.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("El usuario ya existe");
        }

        newUser.setRole("USER");
        newUser.setActive(true);

        String codigoFallaOriginal = newUser.getCodigoFalla();

        // Validación del código
        if (codigoFallaOriginal != null && !codigoFallaOriginal.isEmpty()) {
            Optional<User> fallaOpt = userRepository.findByFallaInfo_FallaCode(codigoFallaOriginal);
            if (!fallaOpt.isPresent()) {
                return ResponseEntity.badRequest().body("Código de falla inválido.");
            }
            newUser.setPendienteUnion(true); // marcar como pendiente
        }

        // Guardamos el usuario
        User savedUser = userService.saveUser(newUser);

        // Agregamos el ID a la lista de solicitudes pendientes de la falla
        if (codigoFallaOriginal != null && !codigoFallaOriginal.isEmpty()) {
            Optional<User> fallaOpt = userRepository.findByFallaInfo_FallaCode(codigoFallaOriginal);
            if (fallaOpt.isPresent()) {
                User falla = fallaOpt.get();
                if ("FALLA".equals(falla.getRole()) && falla.getFallaInfo() != null) {
                    if (!falla.getFallaInfo().getPendingRequests().contains(savedUser.getId())) {
                        falla.getFallaInfo().getPendingRequests().add(savedUser.getId());
                        userRepository.save(falla);
                    }
                }
            }
        }

        return ResponseEntity.ok("Usuario registrado correctamente");
    }

    @GetMapping("/profile-image/{userId}")
    public ResponseEntity<?> getProfileImage(@PathVariable String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            Map<String, String> response = new HashMap<>();
            response.put("profileImageUrl", user.getProfileImageUrl() != null ? user.getProfileImageUrl() : "");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado con ID " + userId);
        }
    }

    @GetMapping("/protected")
    public ResponseEntity<?> getProtectedInfo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Map<String, String> response = new HashMap<>();
        response.put("message", "✅ Hola " + email + ", estás autenticado correctamente.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            Map<String, String> response = new HashMap<>();
            response.put("username", user.getUsername());
            response.put("profileImageUrl", user.getProfileImageUrl());
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(404).body("Usuario no encontrado");
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication auth) {
        String email = auth.getName();
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            Map<String, Object> data = new HashMap<>();
            data.put("id", user.getId());
            data.put("username", user.getUsername());
            data.put("email", user.getEmail());
            data.put("profileImageUrl", user.getProfileImageUrl());
            return ResponseEntity.ok(data);
        } else {
            return ResponseEntity.status(404).body("Usuario no encontrado");
        }
    }
}
