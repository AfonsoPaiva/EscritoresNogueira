package com.escritoresnogueira.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin/api")
public class EmailConfigController {

    @Value("${app.email.from:no-reply@escritoresnogueira.com}")
    private String appEmailFrom;

    @Value("${app.newsletter.from:}")
    private String appNewsletterFrom;

    @Value("${mailgun.api-key:}")
    private String mailgunApiKey;

    @Value("${mailgun.domain:}")
    private String mailgunDomain;

    @GetMapping("/email-config")
    public Map<String, Object> get() {
        boolean mailgunConfigured = mailgunApiKey != null && !mailgunApiKey.isBlank() && mailgunDomain != null && !mailgunDomain.isBlank();
        String effective = (appNewsletterFrom != null && !appNewsletterFrom.isBlank()) ? appNewsletterFrom : appEmailFrom;
        return Map.of(
                "appEmailFrom", appEmailFrom,
                "appNewsletterFrom", appNewsletterFrom,
                "effectiveNewsletterFrom", effective,
                "mailgunConfigured", mailgunConfigured,
                "mailgunDomain", mailgunDomain == null ? "" : mailgunDomain
        );
    }
}
