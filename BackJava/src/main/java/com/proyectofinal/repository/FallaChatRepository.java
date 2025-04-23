package com.proyectofinal.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.proyectofinal.model.FallaChat;

public interface FallaChatRepository extends MongoRepository<FallaChat, String> {
    // El ID es el fallaCode (String)
}
