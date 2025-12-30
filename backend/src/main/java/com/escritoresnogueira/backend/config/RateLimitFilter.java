package com.escritoresnogueira.backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Bucket bucket = Bucket.builder()
        .addLimit(Bandwidth.simple(10, Duration.ofMinutes(1))) // 10 requests per minute
        .build();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        if (!bucket.tryConsume(1)) {
            response.setStatus(429);
            response.getWriter().write("Too many requests");
            return;
        }
        filterChain.doFilter(request, response);
    }
}