package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscribeNewsletterRequest {
    private String email;
    private String name;
    private String recaptchaToken;

    // optional: client may request an invisible challenge when v3 score is low
    private Boolean challenge;
}


