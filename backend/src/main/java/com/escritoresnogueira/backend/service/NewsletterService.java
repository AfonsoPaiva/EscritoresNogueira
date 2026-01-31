package com.escritoresnogueira.backend.service;

import com.escritoresnogueira.backend.dto.NewsletterClientDTO;
import com.escritoresnogueira.backend.model.NewsletterClient;
import com.escritoresnogueira.backend.repository.NewsletterClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsletterService {

    private final NewsletterClientRepository newsletterClientRepository;
    private final EmailService emailService;

    @Transactional
    public NewsletterClientDTO subscribe(String email, String name) {
        // Check if already subscribed and active
        Optional<NewsletterClient> existing = newsletterClientRepository.findByEmailAndActiveTrue(email);
        if (existing.isPresent()) {
            log.info("Email já está inscrito na newsletter: {}", email);
            return mapToDTO(existing.get());
        }

        // Check if exists but inactive, reactivate
        Optional<NewsletterClient> inactive = newsletterClientRepository.findByEmail(email);
        if (inactive.isPresent()) {
            NewsletterClient client = inactive.get();
            client.setActive(true);
            client.setUnsubscribedAt(null);
            client.setName(name != null ? name : client.getName());
            NewsletterClient saved = newsletterClientRepository.save(client);
            log.info("Reativada inscrição na newsletter para: {}", email);
            // Send welcome email to reactivated subscribers as well
            try {
                String displayName = name != null ? name : (saved.getName() != null ? saved.getName() : "Cliente");
                emailService.sendWelcomeEmail(saved.getEmail(), displayName, saved.getUnsubscribeToken());
                log.info("Email de boas-vindas (reativado) enviado para: {}", email);
            } catch (Exception e) {
                log.error("Erro ao enviar email de boas-vindas (reativado) para {}: {}", email, e.getMessage());
            }
            return mapToDTO(saved);
        }

        // Create new subscription
        NewsletterClient client = NewsletterClient.builder()
                .email(email)
                .name(name)
                .active(true)
                .build();

        NewsletterClient saved = newsletterClientRepository.save(client);

        // Send welcome email (include unsubscribe token)
        try {
            String displayName = name != null ? name : "Cliente";
            emailService.sendWelcomeEmail(saved.getEmail(), displayName, saved.getUnsubscribeToken());
            log.info("Email de boas-vindas enviado para: {}", email);
        } catch (Exception e) {
            log.error("Erro ao enviar email de boas-vindas para {}: {}", email, e.getMessage());
        }

        log.info("Nova inscrição na newsletter: {}", email);
        return mapToDTO(saved);
    }

    @Transactional
    public boolean unsubscribe(String email) {
        Optional<NewsletterClient> client = newsletterClientRepository.findByEmailAndActiveTrue(email);
        if (client.isPresent()) {
            NewsletterClient newsletterClient = client.get();
            newsletterClient.setActive(false);
            newsletterClient.setUnsubscribedAt(LocalDateTime.now());
            newsletterClientRepository.save(newsletterClient);
            log.info("Cancelada inscrição na newsletter: {}", email);
            return true;
        }
        log.warn("Tentativa de cancelar inscrição para email não encontrado: {}", email);
        return false;
    }

    @Transactional
    public boolean unsubscribeByToken(String token) {
        Optional<NewsletterClient> client = newsletterClientRepository.findByUnsubscribeToken(token);
        if (client.isPresent()) {
            NewsletterClient newsletterClient = client.get();
            newsletterClient.setActive(false);
            newsletterClient.setUnsubscribedAt(LocalDateTime.now());
            newsletterClientRepository.save(newsletterClient);
            log.info("Cancelada inscrição via token: {}", newsletterClient.getEmail());
            return true;
        }
        log.warn("Token de cancelamento inválido: {}", token);
        return false;
    }

    public List<NewsletterClientDTO> getAllActiveSubscribers() {
        return newsletterClientRepository.findByActiveTrue()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public long getActiveSubscriberCount() {
        return newsletterClientRepository.countByActiveTrue();
    }

    public boolean isSubscribed(String email) {
        return newsletterClientRepository.findByEmailAndActiveTrue(email).isPresent();
    }

    private NewsletterClientDTO mapToDTO(NewsletterClient client) {
        return NewsletterClientDTO.builder()
                .id(client.getId())
                .email(client.getEmail())
                .name(client.getName())
                .subscribedAt(client.getSubscribedAt())
                .active(client.isActive())
                .unsubscribeToken(client.getUnsubscribeToken())
                .build();
    }
}