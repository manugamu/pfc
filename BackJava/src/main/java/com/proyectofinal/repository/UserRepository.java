package com.proyectofinal.repository;

import com.proyectofinal.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    boolean existsByUsername(String username);

    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);

    @Query("{'fallaInfo.fallaCode': ?0}")
    Optional<User> findByFallaInfo_FallaCode(String fallaCode);

    @Query("{'fallaInfo.fallaCode': ?0}")
    List<User> findAllByFallaInfo_FallaCode(String fallaCode);

    List<User> findByPendienteUnionTrueAndCodigoFalla(String codigoFalla);
}
