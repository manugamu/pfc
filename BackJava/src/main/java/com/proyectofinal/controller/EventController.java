package com.proyectofinal.controller;

import com.proyectofinal.model.Event;
import com.proyectofinal.repository.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class EventController {

    @Autowired
    private EventRepository eventRepository;

    // Obtener todos los eventos (público)
    @GetMapping
    public ResponseEntity<List<Event>> getAllEvents() {
        List<Event> events = eventRepository.findAll();
        // Asegúrate de que en cada objeto Event existan los campos creatorId y creatorName
        return ResponseEntity.ok(events);
    }

    // Obtener un evento por ID
    @GetMapping("/{id}")
    public ResponseEntity<Event> getEventById(@PathVariable String id) {
        Optional<Event> event = eventRepository.findById(id);
        return event.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Crear un nuevo evento (protegido)
    @PostMapping
    public ResponseEntity<Event> createEvent(@RequestBody Event event) {
        // Es vital que al crear el evento se asigne el creatorId (y creatorName, si se requiere)
        // Esto podría hacerse en el backend, extrayendo la información del usuario autenticado.
        Event savedEvent = eventRepository.save(event);
        return ResponseEntity.ok(savedEvent);
    }

    // Eliminar un evento (opcional)
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
