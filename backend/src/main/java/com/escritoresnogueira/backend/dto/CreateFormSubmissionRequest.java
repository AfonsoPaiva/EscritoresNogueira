package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateFormSubmissionRequest {
    private String name;
    private String email;
    private String phone;
    private String message;
    private String plan;
    private String bookTitle;
    private String bookGenre;
    private String wordCount;
    private String manuscriptStatus;
    private String bookType;
    private String bookSynopsis;
    private String additionalInfo;
    private String recaptchaToken;
    private Boolean privacyConsent;
}
