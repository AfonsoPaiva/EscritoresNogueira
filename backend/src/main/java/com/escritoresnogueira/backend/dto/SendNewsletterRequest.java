package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendNewsletterRequest {
    private String subject;
    private String content;
}


