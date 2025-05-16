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

            // Actualizar usuario aceptado
            usuario.setRole("FALLERO");
            usuario.setCodigoFalla(falla.getFallaInfo().getFallaCode());
            usuario.setPendienteUnion(false);
            userRepository.save(usuario);

            // Actualizar lista de falleros en la falla
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
        Optional<User> userOpt = userRepository.findById(userId);

        if (fallaOpt.isPresent()) {
            User falla = fallaOpt.get();

            // Remover de pendiente en falla
            if (falla.getFallaInfo() != null) {
                falla.getFallaInfo().getPendingRequests().remove(userId);
                userRepository.save(falla);
            }

            // Limpiar usuario
            if (userOpt.isPresent()) {
                User usuario = userOpt.get();
                usuario.setCodigoFalla(null);
                usuario.setPendienteUnion(false);
                userRepository.save(usuario);
            }

            return ResponseEntity.ok("Solicitud rechazada");
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Falla no encontrada");
    }

    /**
     * Eliminar un fallero de la falla
     * - Quita el ID de fallero de la falla
     * - Resetea el código de falla del usuario a null
     * - Cambia su rol a USER
     */
    @DeleteMapping("/{fallaId}/fallero/{userId}")
    public ResponseEntity<?> eliminarFallero(
            @PathVariable String fallaId,
            @PathVariable String userId) {

        Optional<User> fallaOpt = userRepository.findById(fallaId);
        Optional<User> userOpt = userRepository.findById(userId);

        if (fallaOpt.isPresent() && userOpt.isPresent()) {
            User falla = fallaOpt.get();
            User usuario = userOpt.get();

            // Quitar de la lista de falleros
            if (falla.getFallaInfo() != null) {
                falla.getFallaInfo().getFalleroIds().remove(userId);
                userRepository.save(falla);
            }

            // Resetear usuario
            usuario.setCodigoFalla(null);
            usuario.setPendienteUnion(false);
            usuario.setRole("USER");
            userRepository.save(usuario);

            return ResponseEntity.ok("Fallero eliminado de la falla");
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Falla o usuario no encontrados");
    }
    
    @GetMapping("/{fallaId}/falleros")
    public ResponseEntity<?> getFalleros(@PathVariable String fallaId) {
        Optional<User> fallaOpt = userRepository.findById(fallaId);
        if (fallaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                 .body("Falla no encontrada");
        }
        User falla = fallaOpt.get();
        // extrae los IDs de falleros
        List<String> falleroIds = falla.getFallaInfo() != null
                                 ? falla.getFallaInfo().getFalleroIds()
                                 : Collections.emptyList();
        // carga los usuarios
        List<User> falleros = userRepository.findAllById(falleroIds);
        // (opcional) podrías mapearlos a un DTO si no quieres exponer password u otros campos
        return ResponseEntity.ok(falleros);
    }
    
}
