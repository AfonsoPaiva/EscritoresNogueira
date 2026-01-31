package com.escritoresnogueira.backend.config;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.List;

@Slf4j
@Component
public class AdminJwtAuthFilter extends OncePerRequestFilter {

    @Value("${APP_ADMIN_JWT_SECRET:}")
    private String jwtSecret;

    private static final String COOKIE_NAME = "ADMIN_AUTH";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = null;

        // Try cookie first
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if (COOKIE_NAME.equals(c.getName())) {
                    token = c.getValue();
                    break;
                }
            }
        }

        // Fallback to Authorization header
        if (token == null) {
            String auth = request.getHeader("Authorization");
            if (auth != null && auth.startsWith("Bearer ")) {
                token = auth.substring(7).trim();
            }
        }

        if (token == null || token.isBlank() || jwtSecret == null || jwtSecret.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Key key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            // Use compatible parser for the project's JJWT version (call build() before parse)
            Jwts.parser().setSigningKey(key).build().parseClaimsJws(token);

            // token valid: set ROLE_ADMIN
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    "admin-user", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("[AdminJwtAuthFilter] JWT valid, security context set with ROLE_ADMIN");

        } catch (JwtException ex) {
            log.debug("[AdminJwtAuthFilter] JWT validation failed: {}", ex.getMessage());
            // do nothing, let other filters handle (e.g. ApiKeyAuthFilter may enforce API key)
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        // Only run for admin API paths
        return !path.startsWith(request.getContextPath() + "/admin");
    }
}
