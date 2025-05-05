package com.proyectofinal.controller;

import com.proyectofinal.model.User;
import com.proyectofinal.model.User.FallaInfo;
import com.proyectofinal.repository.UserRepository;
import com.proyectofinal.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.*;

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

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody User newUser) {
        if (userService.findByEmail(newUser.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("El usuario ya existe");
        }

        newUser.setRole("USER");
        newUser.setActive(true);

        String codigoFallaOriginal = newUser.getCodigoFalla();
        if (codigoFallaOriginal != null && !codigoFallaOriginal.isEmpty()) {
            Optional<User> fallaOpt = userRepository.findByFallaInfo_FallaCode(codigoFallaOriginal);
            if (!fallaOpt.isPresent()) {
                return ResponseEntity.badRequest().body("Código de falla inválido.");
            }
            newUser.setPendienteUnion(true);
        }

        User savedUser = userService.saveUser(newUser);

        if (codigoFallaOriginal != null && !codigoFallaOriginal.isEmpty()) {
            Optional<User> fallaOpt = userRepository.findByFallaInfo_FallaCode(codigoFallaOriginal);
            if (fallaOpt.isPresent()) {
                User falla = fallaOpt.get();
                FallaInfo fi = falla.getFallaInfo();
                if (fi != null && !"".equals(fi.getFallaCode())) {
                    if (!fi.getPendingRequests().contains(savedUser.getId())) {
                        fi.getPendingRequests().add(savedUser.getId());
                        userRepository.save(falla);
                    }
                }
            }
        }

        return ResponseEntity.ok("Usuario registrado correctamente");
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
            } catch (Exception e) {
                System.err.println("Error al notificar el cambio de imagen al servidor de chat: " + e.getMessage());
            }

            return ResponseEntity.ok("Foto de perfil actualizada");
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
        }
    }


    @PutMapping("/solicitar-union")
    public ResponseEntity<?> solicitarUnion(@RequestBody Map<String, String> body, Authentication auth) {
        String codigo = body.get("codigoFalla");
        if (codigo == null || codigo.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Falta código de falla");
        }

        String email = auth.getName();
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado");
        }
        User usuario = userOpt.get();

        Optional<User> fallaOpt = userRepository.findByFallaInfo_FallaCode(codigo);
        if (fallaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Falla no encontrada");
        }
        User falla = fallaOpt.get();

        usuario.setCodigoFalla(codigo);
        usuario.setPendienteUnion(true);
        userRepository.save(usuario);

        FallaInfo fi = falla.getFallaInfo();
        if (fi != null) {
            List<String> requests = fi.getPendingRequests();
            if (!requests.contains(usuario.getId())) {
                requests.add(usuario.getId());
                falla.setFallaInfo(fi);
                userRepository.save(falla);
            }
        }

        return ResponseEntity.ok("Solicitud de unión enviada correctamente");
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
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("profileImageUrl", user.getProfileImageUrl());
            response.put("role", user.getRole());
            response.put("fallaInfo", user.getFallaInfo());
            response.put("codigoFalla", user.getCodigoFalla());
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
            data.put("role", user.getRole());
            data.put("fallaInfo", user.getFallaInfo());
            data.put("codigoFalla", user.getCodigoFalla());
            data.put("pendienteUnion", user.isPendienteUnion());
            data.put("fullName", user.getFullName());// ← nuevo
            return ResponseEntity.ok(data);
        } else {
            return ResponseEntity.status(404).body("Usuario no encontrado");
        }
    }
    
    
    @PostMapping("/cancelar-union")
    public ResponseEntity<?> cancelUnionRequest(Authentication auth) {
        String email = auth.getName();
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
        }
        User user = userOpt.get();
        if (!user.isPendienteUnion()) {
            return ResponseEntity.badRequest().body("No hay solicitud pendiente");
        }
        String codigoFalla = user.getCodigoFalla();
        userRepository.findByFallaInfo_FallaCode(codigoFalla).ifPresent(falla -> {
            falla.getFallaInfo().getPendingRequests().removeIf(id -> id.equals(user.getId()));
            userRepository.save(falla);
        });

        user.setPendienteUnion(false);
        user.setCodigoFalla(null);
        userRepository.save(user);

        return ResponseEntity.ok("Solicitud cancelada");
    }
    
}
