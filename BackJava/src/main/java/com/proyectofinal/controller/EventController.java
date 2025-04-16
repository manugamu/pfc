package com.proyectofinal.controller;

import com.proyectofinal.model.Event;
import com.proyectofinal.model.User;
import com.proyectofinal.repository.EventRepository;
import com.proyectofinal.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;


import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class EventController {

    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private UserRepository userRepository;


    
    @GetMapping
    public ResponseEntity<List<Event>> getAllEvents() {
        List<Event> events = eventRepository.findAll();
     
        return ResponseEntity.ok(events);
    }

  
    @GetMapping("/{id}")
    public ResponseEntity<Event> getEventById(@PathVariable String id) {
        Optional<Event> event = eventRepository.findById(id);
        return event.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

  
    @PostMapping
    public ResponseEntity<?> createEvent(@RequestBody Event event, Authentication auth) {
        try {
        
            String email = auth.getName();

           
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado");
            }

            User user = userOpt.get();

           
            String role = user.getRole();
            if (!"FALLA".equalsIgnoreCase(role) && !"FALLERO".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("No tienes permisos para crear eventos");
            }

       
            event.setCreatorId(user.getId());
            event.setCreatorName(user.getUsername());

        
            Event savedEvent = eventRepository.save(event);
            return ResponseEntity.ok(savedEvent);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al crear el evento: " + e.getMessage());
        }
    }



    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable String id) {
        if (eventRepository.existsById(id)) {
            eventRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
