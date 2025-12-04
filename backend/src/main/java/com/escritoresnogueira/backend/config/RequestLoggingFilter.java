package main.java.com.escritoresnogueira.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.stream.Collectors;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // Skip logging for health checks and actuator to reduce noise
        String path = request.getRequestURI();
        if (path.contains("/actuator") || path.equals("/health") || path.equals("/")) {
            filterChain.doFilter(request, response);
            return;
        }

        ContentCachingRequestWrapper requestWrapper = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);

        long startTime = System.currentTimeMillis();
        
        // Log request details
        logRequest(requestWrapper);

        try {
            filterChain.doFilter(requestWrapper, responseWrapper);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            logResponse(requestWrapper, responseWrapper, duration);
            
            // Copy response body back to the actual response
            responseWrapper.copyBodyToResponse();
        }
    }

    private void logRequest(ContentCachingRequestWrapper request) {
        String method = request.getMethod();
        String path = request.getRequestURI();
        String queryString = request.getQueryString();
        String contentType = request.getContentType();
        
        log.info("===== INCOMING REQUEST =====");
        log.info("[Request] {} {} {}", method, path, queryString != null ? "?" + queryString : "");
        log.info("[Request] Content-Type: {}", contentType);
        log.info("[Request] Remote Address: {}", request.getRemoteAddr());
        
        // Log relevant headers
        Collections.list(request.getHeaderNames()).forEach(headerName -> {
            if (shouldLogHeader(headerName)) {
                log.debug("[Request] Header '{}': {}", headerName, request.getHeader(headerName));
            }
        });
    }

    private void logResponse(ContentCachingRequestWrapper request, ContentCachingResponseWrapper response, long duration) {
        int status = response.getStatus();
        String method = request.getMethod();
        String path = request.getRequestURI();
        
        String statusCategory = getStatusCategory(status);
        
        if (status >= 400) {
            log.warn("[Response] {} {} - Status: {} ({}) - Duration: {}ms", 
                    method, path, status, statusCategory, duration);
            
            // Log response body for error responses
            byte[] responseBody = response.getContentAsByteArray();
            if (responseBody.length > 0 && responseBody.length < 1000) {
                String body = new String(responseBody, StandardCharsets.UTF_8);
                log.warn("[Response] Error Body: {}", body);
            }
        } else {
            log.info("[Response] {} {} - Status: {} ({}) - Duration: {}ms", 
                    method, path, status, statusCategory, duration);
        }
        
        log.info("===== REQUEST COMPLETE =====");
    }

    private boolean shouldLogHeader(String headerName) {
        String lower = headerName.toLowerCase();
        // Log relevant headers but skip sensitive ones
        return lower.contains("content") || 
               lower.contains("accept") || 
               lower.contains("api-key") || 
               lower.contains("escritoresnogueira") ||
               lower.contains("x-") ||
               lower.equals("host") ||
               lower.equals("origin");
    }

    private String getStatusCategory(int status) {
        if (status < 200) return "Informational";
        if (status < 300) return "Success";
        if (status < 400) return "Redirect";
        if (status < 500) return "Client Error";
        return "Server Error";
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip filtering for static resources
        return path.contains("/static") || 
               path.contains("/favicon") || 
               path.endsWith(".js") || 
               path.endsWith(".css") || 
               path.endsWith(".html");
    }
}
