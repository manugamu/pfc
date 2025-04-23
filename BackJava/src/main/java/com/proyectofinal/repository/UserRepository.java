package com.proyectofinal.repository;

import com.proyectofinal.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);

    // Consultas para acceder a fallaCode dentro de fallaInfo
    @Query("{'fallaInfo.fallaCode': ?0}")
    Optional<User> findByFallaInfo_FallaCode(String fallaCode);

    @Query("{'fallaInfo.fallaCode': ?0}")
    List<User> findAllByFallaInfo_FallaCode(String fallaCode); // Para obtener todos los falleros

    List<User> findByPendienteUnionTrueAndCodigoFalla(String codigoFalla); // Solicitudes pendientes
}
