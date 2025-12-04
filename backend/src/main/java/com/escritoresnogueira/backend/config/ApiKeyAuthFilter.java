package main.java.com.escritoresnogueira.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
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
import java.util.List;

@Slf4j
@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private static final String HEADER_NAME = "EscritoresNogueira-API-KEY";
    private static final String ALT_HEADER_NAME = "X-API-Key"; // Alternative header for flexibility

    // If APP_API_KEY is not set, default to empty string so header-only (dev) mode works.
    @Value("${APP_API_KEY:}")
    private String apiKey;


    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();
        String contentType = request.getContentType();
        String contextPath = request.getContextPath();

        log.debug("[ApiKeyAuthFilter] ========== REQUEST START ==========");
        log.debug("[ApiKeyAuthFilter] Method: {} | Path: {} | Context: {}", method, path, contextPath);
        log.debug("[ApiKeyAuthFilter] Content-Type: {}", contentType);

        // We only enforce API key for admin paths. Public read endpoints remain accessible.
        // Use the servlet context path (e.g. /api) so mapping works whether app runs with or without context path.
        boolean isAdminPath = path.startsWith(contextPath + "/admin");

        if (!isAdminPath) {
            log.debug("[ApiKeyAuthFilter] Not an admin path, skipping API key check");
            filterChain.doFilter(request, response);
            return;
        }

        log.info("[ApiKeyAuthFilter] Admin path detected: {} {}", method, path);

        // For admin paths, require a valid API key. If not present or invalid, reject.
        // Check both header names for flexibility
        String provided = request.getHeader(HEADER_NAME);
        if (provided == null || provided.isBlank()) {
            provided = request.getHeader(ALT_HEADER_NAME);
            if (provided != null && !provided.isBlank()) {
                log.debug("[ApiKeyAuthFilter] Using alternative header: {}", ALT_HEADER_NAME);
            }
        }
        if (provided != null) provided = provided.trim();

        boolean headerPresent = provided != null && !provided.isBlank();
        boolean serverKeyConfigured = apiKey != null && !apiKey.isBlank();

        log.debug("[ApiKeyAuthFilter] Header present: {} | Server key configured: {}", headerPresent, serverKeyConfigured);

        if (!headerPresent) {
            log.warn("[ApiKeyAuthFilter] REJECTED - Missing API key for admin path: {} {}", method, path);
            sendJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Missing API key", 
                "Please provide the API key in the '" + HEADER_NAME + "' or '" + ALT_HEADER_NAME + "' header");
            return;
        }

        // If server has no configured API key (developer/testing mode), accept any non-empty header value.
        if (!serverKeyConfigured) {
            log.info("[ApiKeyAuthFilter] DEV MODE - No server API key configured; accepting provided API key for: {} {}", method, path);
        } else {
            boolean match = provided.equals(apiKey);
            log.debug("[ApiKeyAuthFilter] API key validation: match={}", match);
            if (!match) {
                log.warn("[ApiKeyAuthFilter] REJECTED - Invalid API key for admin path: {} {}", method, path);
                sendJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid API key", 
                    "The provided API key is incorrect");
                return;
            }
        }

        log.info("[ApiKeyAuthFilter] AUTHORIZED - API key valid for: {} {}", method, path);

        // API key valid: create an Authentication with ROLE_ADMIN so existing security rules pass
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "api-key-admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        SecurityContextHolder.getContext().setAuthentication(auth);
        log.debug("[ApiKeyAuthFilter] Security context set with ROLE_ADMIN");
        log.debug("[ApiKeyAuthFilter] ========== REQUEST AUTHORIZED ==========");
        
        filterChain.doFilter(request, response);
    }

    /**
     * Send a JSON formatted error response
     */
    private void sendJsonError(HttpServletResponse response, int status, String error, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        String jsonResponse = String.format(
            "{\"error\": \"%s\", \"message\": \"%s\", \"status\": %d, \"timestamp\": \"%s\"}",
            error, message, status, java.time.Instant.now().toString()
        );
        response.getWriter().write(jsonResponse);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        // Skip filtering for actuator endpoints and static resources
        boolean skip = path.contains("/actuator") || path.contains("/static") || path.contains("/favicon");
        if (skip) {
            log.trace("[ApiKeyAuthFilter] Skipping filter for path: {}", path);
        }
        return skip;
    }
}
