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
    private String bookSynopsis;
    private String additionalInfo;
    
    // Calculator data from services page
    private String printType;        // 'pb' or 'cor'
    private String coverType;        // 'mole' or 'dura'
    private String bookSize;         // e.g., '6x9', '8.5x11'
    private Integer pages;           // Number of pages (rounded)
    private Boolean hasIllustrations; // Whether book has illustrations
    private Integer quantity;        // Number of copies
    private Double calculatedPrice;  // Total calculated price
    
    private LocalDateTime submittedAt;
}
