package com.escritoresnogueira.backend.controller;

import com.escritoresnogueira.backend.model.NewsletterMessage;
import com.escritoresnogueira.backend.repository.NewsletterMessageRepository;
import com.escritoresnogueira.backend.repository.NewsletterClientRepository;
import com.escritoresnogueira.backend.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/admin/newsletters")
@RequiredArgsConstructor
public class AdminNewsletterController {

    private final NewsletterMessageRepository newsletterMessageRepository;
    private final NewsletterClientRepository newsletterClientRepository;
    private final NewsletterService newsletterService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<NewsletterMessage> list() {
        return newsletterMessageRepository.findAll();
    }

    @GetMapping("/clients")
    @PreAuthorize("hasRole('ADMIN')")
    public List<?> listClients() {
        return newsletterService.getAllActiveSubscribers();
    }

    @GetMapping("/clients/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getClient(@PathVariable Long id) {
        return newsletterClientRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/clients/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteClient(@PathVariable Long id) {
        if (!newsletterClientRepository.existsById(id)) return ResponseEntity.notFound().build();
        newsletterClientRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> get(@PathVariable Long id) {
        Optional<NewsletterMessage> m = newsletterMessageRepository.findById(id);
        return m.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody NewsletterMessage updated) {
        return newsletterMessageRepository.findById(id).map(existing -> {
            existing.setSubject(updated.getSubject());
            existing.setContent(updated.getContent());
            newsletterMessageRepository.save(existing);
            return ResponseEntity.ok(existing);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!newsletterMessageRepository.existsById(id)) return ResponseEntity.notFound().build();
        newsletterMessageRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
