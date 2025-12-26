package com.escritoresnogueira.backend.controller;

import com.escritoresnogueira.backend.dto.CreateFormSubmissionRequest;
import com.escritoresnogueira.backend.dto.FormSubmissionDTO;
import com.escritoresnogueira.backend.service.FormSubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/form-submissions")
@RequiredArgsConstructor
@Slf4j
public class PublicFormSubmissionController {

    private final FormSubmissionService service;

    @PostMapping
    public ResponseEntity<?> submit(@Valid @RequestBody CreateFormSubmissionRequest req, HttpServletRequest request) {
        String remoteIp = request.getRemoteAddr();
        try {
            FormSubmissionDTO dto = service.save(req, remoteIp);
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (IllegalArgumentException ex) {
            log.warn("Form submission rejected: {}", ex.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "recaptcha_failed", "message", ex.getMessage()));
        } catch (Exception ex) {
            log.error("Unexpected error saving form submission", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "internal_error"));
        }
    }
}
