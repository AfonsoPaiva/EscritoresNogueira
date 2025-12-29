package com.escritoresnogueira.backend.service;

import com.escritoresnogueira.backend.dto.CreateFormSubmissionRequest;
import com.escritoresnogueira.backend.dto.FormSubmissionDTO;
import com.escritoresnogueira.backend.model.FormSubmission;
import com.escritoresnogueira.backend.repository.FormSubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FormSubmissionService {

    private final FormSubmissionRepository repository;
    private final EmailService emailService;
    private final ReCaptchaService reCaptchaService;
    public FormSubmissionDTO save(CreateFormSubmissionRequest req, String remoteIp) {
        // Verify reCAPTCHA token server-side
        String token = req.getRecaptchaToken();
        boolean captchaOk = reCaptchaService.verifyToken(token, remoteIp);
        if (!captchaOk) {
            log.warn("reCAPTCHA verification failed for submission from {}", remoteIp);
            throw new IllegalArgumentException("reCAPTCHA verification failed");
        }

        
        
        
        
        
        
        FormSubmission entity = FormSubmission.builder()
                .name(req.getName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .message(req.getMessage())
                .plan(req.getPlan())
                .bookTitle(req.getBookTitle())
                .bookGenre(req.getBookGenre())
                .wordCount(req.getWordCount())
                .manuscriptStatus(req.getManuscriptStatus())
                .bookType(req.getBookType())
                .bookSynopsis(req.getBookSynopsis())
                .additionalInfo(req.getAdditionalInfo())
                .submittedAt(LocalDateTime.now())
                .build();

        FormSubmission saved = repository.save(entity);

        // Send acknowledgement email to the submitter
        try {
            String subject = "Obrigado pelo seu contacto — Escritores Nogueira";
            StringBuilder content = new StringBuilder();
            // Short intro (the actual greeting is added by sendNewsletterEmail)
            content.append("<p>Obrigado por nos contactar. Recebemos o seu pedido com os seguintes detalhes:</p>");
            content.append("<ul style='list-style:none;padding:0;margin:0;'>");
            content.append("<li style='margin:8px 0;'><span style='display:inline-block;width:28px;'>📦</span><strong>Plano:</strong> " + safe(saved.getPlan()) + "</li>");
            content.append("<li style='margin:8px 0;'><span style='display:inline-block;width:28px;'>📘</span><strong>Título do livro:</strong> " + safe(saved.getBookTitle()) + "</li>");
            content.append("<li style='margin:8px 0;'><span style='display:inline-block;width:28px;'>🏷️</span><strong>Género:</strong> " + safe(saved.getBookGenre()) + "</li>");
            content.append("<li style='margin:8px 0;'><span style='display:inline-block;width:28px;'>🔢</span><strong>Nº de palavras:</strong> " + safe(saved.getWordCount()) + "</li>");
            content.append("<li style='margin:8px 0;'><span style='display:inline-block;width:28px;'>📝</span><strong>Estado do manuscrito:</strong> " + safe(saved.getManuscriptStatus()) + "</li>");
            content.append("<li style='margin:8px 0;'><span style='display:inline-block;width:28px;'>📚</span><strong>Tipo de livro:</strong> " + safe(saved.getBookType()) + "</li>");
            content.append("<li style='margin:8px 0;'><span style='display:inline-block;width:28px;'>✍️</span><strong>Sinopse:</strong> " + safe(saved.getBookSynopsis()) + "</li>");
            content.append("<li style='margin:8px 0;'><span style='display:inline-block;width:28px;'>🗒️</span><strong>Informações adicionais:</strong> " + safe(saved.getAdditionalInfo()) + "</li>");
            content.append("<li style='margin:8px 0;'><span style='display:inline-block;width:28px;'>💬</span><strong>Mensagem:</strong> " + safe(saved.getMessage()) + "</li>");
            content.append("</ul>");
            content.append("<p style='margin-top:16px;'>Iremos responder em breve.<br/>Cumprimentos,<br/>Equipe Escritores Nogueira</p>");

            // Send acknowledgement as transactional (no-reply) email
            emailService.sendTransactionalEmail(saved.getEmail(), subject, content.toString(), null);
        } catch (Exception e) {
            log.error("Erro ao enviar email de confirmação: {}", e.getMessage(), e);
        }

        return toDto(saved);
    }

    public Page<FormSubmissionDTO> findAll(int page, int size) {
        Pageable p = PageRequest.of(page, size);
        return repository.findAll(p).map(this::toDto);
    }

    public FormSubmissionDTO findById(Long id) {
        return repository.findById(id).map(this::toDto).orElse(null);
    }

    public void deleteById(Long id) {
        log.debug("[FormSubmissionService] deleteById({})", id);
        repository.deleteById(id);
        log.info("[FormSubmissionService] Deleted form submission id={}", id);
    }

    private FormSubmissionDTO toDto(FormSubmission s) {
        return FormSubmissionDTO.builder()
                .id(s.getId())
                .name(s.getName())
                .email(s.getEmail())
                .phone(s.getPhone())
                .message(s.getMessage())
                .plan(s.getPlan())
                .bookTitle(s.getBookTitle())
                .bookGenre(s.getBookGenre())
                .wordCount(s.getWordCount())
                .manuscriptStatus(s.getManuscriptStatus())
                .bookType(s.getBookType())
                .bookSynopsis(s.getBookSynopsis())
                .additionalInfo(s.getAdditionalInfo())
                .submittedAt(s.getSubmittedAt())
                .build();
    }

    private String safe(String v) {
        return v == null || v.isBlank() ? "(não fornecido)" : escapeHtml(v);
    }

    private String escapeHtml(String input) {
        // basic escaping to avoid breaking email HTML
        return input.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
