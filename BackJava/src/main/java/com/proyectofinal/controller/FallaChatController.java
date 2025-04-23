package com.proyectofinal.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.proyectofinal.model.FallaChat;
import com.proyectofinal.repository.FallaChatRepository;

@RestController
@RequestMapping("/api/falla-chats")
public class FallaChatController {

    @Autowired
    private FallaChatRepository fallaChatRepository;

    @GetMapping("/{fallaCode}")
    public ResponseEntity<FallaChat> getFallaChat(@PathVariable String fallaCode) {
        return fallaChatRepository.findById(fallaCode)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    // 🆕 Si no existe, creamos un chat vacío con el código de la falla
                    FallaChat nuevoChat = new FallaChat();
                    nuevoChat.setFallaCode(fallaCode);
                    fallaChatRepository.save(nuevoChat);
                    return ResponseEntity.ok(nuevoChat);
                });
    }
}
