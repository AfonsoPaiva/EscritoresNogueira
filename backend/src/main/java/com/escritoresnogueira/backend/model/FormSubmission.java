package com.escritoresnogueira.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "form_submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    private String phone;

    @Column(columnDefinition = "TEXT")
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
