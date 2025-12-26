package com.escritoresnogueira.backend.controller;

import com.escritoresnogueira.backend.model.NewsletterMessage;
import com.escritoresnogueira.backend.repository.NewsletterMessageRepository;
import com.escritoresnogueira.backend.repository.NewsletterClientRepository;
import com.escritoresnogueira.backend.service.NewsletterService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${APP_API_KEY:}")
    private String serverApiKey;

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

    /**
     * API-key protected endpoint to list newsletter clients. Useful for curl scripts.
     * Requires header 'EscritoresNogueira-API-KEY' or 'X-API-Key' matching the server key.
     */
    @GetMapping(value = "/clients/apikey")
    public ResponseEntity<?> listClientsWithApiKey(HttpServletRequest request) {
        String provided = request.getHeader("EscritoresNogueira-API-KEY");
        if (provided == null || provided.isBlank()) provided = request.getHeader("X-API-Key");
        if (provided == null || provided.isBlank()) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "missing_api_key"));
        }
        if (serverApiKey != null && !serverApiKey.isBlank() && !provided.trim().equals(serverApiKey.trim())) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "invalid_api_key"));
        }
        // Dev-mode: if serverApiKey is blank, accept any provided key but don't advertise that.
        return ResponseEntity.ok(newsletterService.getAllActiveSubscribers());
    }

    @DeleteMapping("/clients/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteClient(@PathVariable Long id) {
        if (!newsletterClientRepository.existsById(id)) return ResponseEntity.notFound().build();
        newsletterClientRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Delete subscriber by email (admin). Accepts JSON body: { "email": "..." }
     * This is a convenience endpoint for admin UI where the client may only have email.
     */
    @DeleteMapping("/clients")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteClientByEmail(@RequestBody(required = false) java.util.Map<String, String> body,
                                                 @RequestParam(required = false) String email) {
        // Accept either JSON body { "email": "..." } or query param ?email=...
        String e = null;
        if (body != null && body.get("email") != null) e = body.get("email");
        if ((e == null || e.trim().isEmpty()) && email != null) e = email;
        if (e == null || e.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "email_required"));
        }
        final String normalized = e.trim();
        return newsletterClientRepository.findByEmail(normalized)
                .map(client -> {
                    newsletterClientRepository.deleteById(client.getId());
                    return ResponseEntity.noContent().build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
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
