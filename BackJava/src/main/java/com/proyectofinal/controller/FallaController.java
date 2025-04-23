package com.proyectofinal.controller;

import com.proyectofinal.model.User;
import com.proyectofinal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/falla")
public class FallaController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<?> getFallaByCodigo(@PathVariable String codigo) {
        Optional<User> fallaOpt = userRepository.findByFallaInfo_FallaCode(codigo);
        if (fallaOpt.isPresent()) {
            User falla = fallaOpt.get();
            Map<String, String> data = new HashMap<>();
            data.put("username", falla.getUsername());
            data.put("profileImageUrl", falla.getProfileImageUrl());
            data.put("fullname", falla.getFullName());
            return ResponseEntity.ok(data);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Falla no encontrada");
        }
    }

    @GetMapping("/solicitudes/{fallaId}")
    public ResponseEntity<?> getSolicitudes(@PathVariable String fallaId) {
        Optional<User> fallaOpt = userRepository.findById(fallaId);
        if (fallaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Falla no encontrada");
        }

        User falla = fallaOpt.get();
        List<String> pendingIds = falla.getFallaInfo().getPendingRequests();
        List<User> pendingUsers = userRepository.findAllById(pendingIds);

        return ResponseEntity.ok(pendingUsers);
    }

    @PostMapping("/aceptar")
    public ResponseEntity<?> aceptarSolicitud(@RequestBody Map<String, String> payload) {
        String userId = payload.get("userId");
        String fallaId = payload.get("fallaId");

        Optional<User> fallaOpt = userRepository.findById(fallaId);
        Optional<User> userOpt = userRepository.findById(userId);

        if (fallaOpt.isPresent() && userOpt.isPresent()) {
            User falla = fallaOpt.get();
            User usuario = userOpt.get();

            // ✅ Actualizamos el usuario
            usuario.setRole("FALLERO");
            usuario.setCodigoFalla(falla.getFallaInfo().getFallaCode());
            usuario.setPendienteUnion(false);
            userRepository.save(usuario);

            // ✅ Actualizamos la falla
            if (falla.getFallaInfo() != null) {
                falla.getFallaInfo().getPendingRequests().remove(userId);
                if (!falla.getFallaInfo().getFalleroIds().contains(userId)) {
                    falla.getFallaInfo().getFalleroIds().add(userId);
                }
                userRepository.save(falla);
            }

            return ResponseEntity.ok("Usuario aceptado en la falla");
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Falla o usuario no encontrados");
    }

    @PostMapping("/rechazar")
    public ResponseEntity<?> rechazarSolicitud(@RequestBody Map<String, String> payload) {
        String userId = payload.get("userId");
        String fallaId = payload.get("fallaId");

        Optional<User> fallaOpt = userRepository.findById(fallaId);

        if (fallaOpt.isPresent()) {
            User falla = fallaOpt.get();

            if (falla.getFallaInfo() != null) {
                falla.getFallaInfo().getPendingRequests().remove(userId);
                userRepository.save(falla);
            }

            return ResponseEntity.ok("Solicitud rechazada");
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Falla no encontrada");
    }
}
