package com.escritoresnogueira.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Simple filter that trusts Google IAP headers when present and maps them to an authenticated admin.
 *
 * WARNING: This filter SHOULD ONLY be used when your application is fronted by Google Cloud IAP.
 * It trusts the IAP headers which are set by Google; do NOT enable this when requests can reach
 * your app directly from the public internet without IAP in front.
 */
@Slf4j
@Component
public class AdminIapFilter extends OncePerRequestFilter {

    // Header set by IAP: may look like "accounts.google.com:email@example.com"
    public static final String IAP_EMAIL_HEADER = "x-goog-authenticated-user-email";

    @Value("${IAP_ALLOWED_EMAILS:}")
    private String allowedEmailsCsv;

    @Value("${IAP_ALLOWED_DOMAIN:}")
    private String allowedDomain;

    private Set<String> allowedEmails() {
        if (allowedEmailsCsv == null || allowedEmailsCsv.isBlank()) return Set.of();
        return Set.of(allowedEmailsCsv.split(",")).stream().map(String::trim).collect(Collectors.toSet());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try {
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                String raw = request.getHeader(IAP_EMAIL_HEADER);
                if (raw != null && !raw.isBlank()) {
                    // header format 'accounts.google.com:email@example.com' or just the email
                    String email = raw.contains(":") ? raw.substring(raw.indexOf(":") + 1) : raw;
                    email = email.trim();

                    boolean allowed = false;
                    if (!allowedEmails().isEmpty() && allowedEmails().contains(email)) allowed = true;
                    if (!allowed && allowedDomain != null && !allowedDomain.isBlank()) {
                        allowed = email.toLowerCase().endsWith("@" + allowedDomain.toLowerCase());
                    }

                    if (allowed) {
                        var auth = new UsernamePasswordAuthenticationToken(email, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                        log.debug("Authenticated admin via IAP header: {}", email);
                    } else {
                        log.debug("IAP header present but email not allowed: {}", email);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("IAP auth filter error", ex);
        }
        filterChain.doFilter(request, response);
    }
}
