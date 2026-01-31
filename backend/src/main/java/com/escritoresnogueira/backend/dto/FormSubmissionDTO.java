package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormSubmissionDTO {
    private Long id;
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
    private LocalDateTime submittedAt;
}
