package main.java.com.escritoresnogueira.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
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

    // If APP_API_KEY is not set, default to empty string so header-only (dev) mode works.
    @Value("${APP_API_KEY}")
    private String apiKey;

    private static final String HEADER_NAME = "EscritoresNogueira-API-KEY";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

    // We only enforce API key for admin paths. Public read endpoints remain accessible.
    // Use the servlet context path (e.g. /api) so mapping works whether app runs with or without context path.
    boolean isAdminPath = path.startsWith(request.getContextPath() + "/admin");

        if (!isAdminPath) {
            filterChain.doFilter(request, response);
            return;
        }

        // For admin paths, require a valid API key. If not present or invalid, reject.
        String provided = request.getHeader(HEADER_NAME);
        if (provided != null) provided = provided.trim();

        boolean headerPresent = provided != null && !provided.isBlank();
        boolean serverKeyConfigured = apiKey != null && !apiKey.isBlank();

        if (!headerPresent) {
            log.warn("Missing API key for admin path: {} {}", method, path);
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing API key");
            return;
        }

        // If server has no configured API key (developer/testing mode), accept any non-empty header value.
        if (!serverKeyConfigured) {
            log.info("No server API key configured; accepting provided API key header for admin path: {} {} (dev mode)", method, path);
        } else {
            boolean match = provided.equals(apiKey);
            log.debug("API key check: configured={}, headerPresent={}, match={}", serverKeyConfigured, headerPresent, match);
            if (!match) {
                log.warn("Invalid API key for admin path: {} {}", method, path);
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid API key");
                return;
            }
        }

        // API key valid: create an Authentication with ROLE_ADMIN so existing security rules pass
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "api-key", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        SecurityContextHolder.getContext().setAuthentication(auth);
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        // Let doFilterInternal decide based on path; but avoid filtering actuator or static resources optionally
        return false;
    }
}
