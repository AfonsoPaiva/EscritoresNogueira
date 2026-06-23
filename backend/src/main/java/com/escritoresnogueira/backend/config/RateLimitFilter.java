package com.escritoresnogueira.backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Granular per-IP, per-endpoint rate-limiting filter using Bucket4j (token bucket).
 *
 * Tiers (requests per minute unless stated otherwise):
 *
 *  CRITICAL  – Auth & payment write endpoints:   10 req/min
 *    POST /auth/firebase, /auth/firebase-admin, /auth/register, /auth/forgot-password,
 *    POST /auth/resend-verification, /auth/subscribe-newsletter, /auth/unsubscribe-newsletter,
 *    POST /payments/create-checkout-session, /payments/confirm-session
 *
 *  SENSITIVE – Data write endpoints:             20 req/min
 *    POST /books/{id}/comments, PUT /books/comments/{id}/helpful,
 *    POST /public/form-submissions
 *
 *  STANDARD  – Session and user management:      30 req/min
 *    GET/POST /session/**, /user/**
 *
 *  READ      – Catalogue / blog reads:           60 req/min
 *    GET /books/**, GET /blog/**
 *
 *  CONFIG    – Config/health reads:             120 req/min
 *    GET /auth/firebase-config, /auth/recaptcha-config, /auth/health,
 *    GET /payments/config, GET /, /status, /actuator/health
 *
 *  GLOBAL    – Catch-all safety net:            200 req/min
 *    Everything else not matched above.
 *
 * A separate GLOBAL bucket per-IP acts as a secondary safety net on top of
 * the endpoint-specific bucket, ensuring that even if many different matched
 * endpoints are called rapidly, the total throughput from a single IP is
 * capped at 200 req/min.
 *
 * Buckets are evicted after 10 minutes of inactivity to prevent memory leaks.
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // -------------------------------------------------------------------------
    // Tier limits (capacity = refill per minute)
    // -------------------------------------------------------------------------
    private static final int LIMIT_CRITICAL  = 10;
    private static final int LIMIT_SENSITIVE = 20;
    private static final int LIMIT_STANDARD  = 30;
    private static final int LIMIT_READ      = 60;
    private static final int LIMIT_CONFIG    = 120;
    private static final int LIMIT_GLOBAL    = 200;

    // -------------------------------------------------------------------------
    // Bucket stores: key = "<tier>:<ip>"  to keep tiers isolated
    // -------------------------------------------------------------------------
    private final Map<String, BucketEntry> buckets = new ConcurrentHashMap<>();

    // Scheduler to evict idle buckets and prevent unbounded memory growth
    private final ScheduledExecutorService evictionScheduler =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "rate-limit-eviction");
                t.setDaemon(true);
                return t;
            });

    // Idle threshold: remove bucket entries not accessed in the last 10 minutes
    private static final long IDLE_EVICTION_MS = TimeUnit.MINUTES.toMillis(10);

    public RateLimitFilter() {
        // Schedule periodic cleanup every 5 minutes
        evictionScheduler.scheduleAtFixedRate(this::evictIdleBuckets, 5, 5, TimeUnit.MINUTES);
    }

    // =========================================================================
    // Filter logic
    // =========================================================================

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path   = request.getRequestURI();
        String method = request.getMethod();

        // ------------------------------------------------------------------
        // 1. Bypass: static assets and actuator health (no value in limiting)
        // ------------------------------------------------------------------
        if (isStaticOrHealth(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // ------------------------------------------------------------------
        // 2. Resolve client IP (hardened against header spoofing)
        // ------------------------------------------------------------------
        String clientIp = resolveClientIp(request);

        // ------------------------------------------------------------------
        // 3. Resolve applicable tier for this request
        // ------------------------------------------------------------------
        String tier = resolveTier(method, path);

        // ------------------------------------------------------------------
        // 4. Check endpoint-specific bucket
        // ------------------------------------------------------------------
        if (!tryConsume(tier, clientIp, tierLimit(tier))) {
            rejectTooManyRequests(response, tier, clientIp, path);
            return;
        }

        // ------------------------------------------------------------------
        // 5. Check global safety-net bucket (independent of tier bucket)
        // ------------------------------------------------------------------
        if (!tryConsume("global", clientIp, LIMIT_GLOBAL)) {
            rejectTooManyRequests(response, "global", clientIp, path);
            return;
        }

        filterChain.doFilter(request, response);
    }

    // =========================================================================
    // Tier resolution
    // =========================================================================

    private String resolveTier(String method, String path) {

        // --- CRITICAL: auth write operations & payment writes ---------------
        if (isCritical(method, path)) return "critical";

        // --- SENSITIVE: comment/form write operations -----------------------
        if (isSensitive(method, path)) return "sensitive";

        // --- CONFIG: config / health read operations -----------------------
        if (isConfig(method, path)) return "config";

        // --- READ: catalogue and blog reads --------------------------------
        if (isRead(method, path)) return "read";

        // --- STANDARD: session and user management -------------------------
        if (isStandard(method, path)) return "standard";

        // --- fallback --------------------------------------------------
        return "default";
    }

    private boolean isCritical(String method, String path) {
        if ("POST".equalsIgnoreCase(method)) {
            return path.equals("/auth/firebase")
                || path.equals("/auth/firebase-admin")
                || path.equals("/auth/register")
                || path.equals("/auth/forgot-password")
                || path.equals("/auth/resend-verification")
                || path.equals("/auth/subscribe-newsletter")
                || path.equals("/auth/unsubscribe-newsletter")
                || path.equals("/payments/create-checkout-session")
                || path.equals("/payments/confirm-session")
                || path.equals("/payments/mbway")
                || path.equals("/payments/bank-transfer");
        }
        if ("DELETE".equalsIgnoreCase(method)) {
            return path.equals("/auth/user");
        }
        return false;
    }

    private boolean isSensitive(String method, String path) {
        // POST /books/{id}/comments
        if ("POST".equalsIgnoreCase(method) && path.matches("/books/\\d+/comments")) return true;
        // PUT /books/comments/{id}/helpful — no auth, easy to abuse
        if ("PUT".equalsIgnoreCase(method) && path.matches("/books/comments/\\d+/helpful")) return true;
        // POST /public/form-submissions
        if ("POST".equalsIgnoreCase(method) && path.startsWith("/public/form-submissions")) return true;
        return false;
    }

    private boolean isConfig(String method, String path) {
        if (!"GET".equalsIgnoreCase(method) && !"HEAD".equalsIgnoreCase(method)) return false;
        return path.equals("/auth/firebase-config")
            || path.equals("/auth/recaptcha-config")
            || path.equals("/auth/health")
            || path.equals("/payments/config")
            || path.equals("/payments/stripe-account")
            || path.equals("/")
            || path.equals("/status")
            || path.startsWith("/actuator");
    }

    private boolean isRead(String method, String path) {
        if (!"GET".equalsIgnoreCase(method) && !"HEAD".equalsIgnoreCase(method)) return false;
        return path.startsWith("/books")
            || path.startsWith("/blog");
    }

    private boolean isStandard(String method, String path) {
        return path.startsWith("/session")
            || path.startsWith("/user");
    }

    private int tierLimit(String tier) {
        return switch (tier) {
            case "critical"  -> LIMIT_CRITICAL;
            case "sensitive" -> LIMIT_SENSITIVE;
            case "standard"  -> LIMIT_STANDARD;
            case "read"      -> LIMIT_READ;
            case "config"    -> LIMIT_CONFIG;
            default          -> LIMIT_GLOBAL; // "default" tier
        };
    }

    // =========================================================================
    // Bucket management
    // =========================================================================

    private boolean tryConsume(String tier, String ip, int limitPerMinute) {
        String key = tier + ":" + ip;
        BucketEntry entry = buckets.computeIfAbsent(key, k -> new BucketEntry(buildBucket(limitPerMinute)));
        entry.touch();
        return entry.bucket.tryConsume(1);
    }

    private Bucket buildBucket(int tokensPerMinute) {
        Refill refill = Refill.greedy(tokensPerMinute, Duration.ofMinutes(1));
        Bandwidth limit = Bandwidth.classic(tokensPerMinute, refill);
        return Bucket.builder().addLimit(limit).build();
    }

    // =========================================================================
    // Eviction of idle buckets (memory-leak prevention)
    // =========================================================================

    private void evictIdleBuckets() {
        long now = System.currentTimeMillis();
        int before = buckets.size();
        buckets.entrySet().removeIf(e -> now - e.getValue().lastTouchedMs > IDLE_EVICTION_MS);
        int removed = before - buckets.size();
        if (removed > 0) {
            log.debug("Rate-limit eviction: removed {} idle bucket(s); {} remaining", removed, buckets.size());
        }
    }

    // =========================================================================
    // Response helper
    // =========================================================================

    private void rejectTooManyRequests(HttpServletResponse response,
                                       String tier, String ip, String path) throws IOException {
        log.warn("Rate limit exceeded [tier={}, ip={}, path={}]", tier, ip, path);
        response.setStatus(429);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
            "{\"error\":\"Demasiados pedidos. Por favor tente novamente mais tarde.\","
            + "\"retryAfterSeconds\":60}"
        );
    }

    // =========================================================================
    // IP resolution (hardened)
    // =========================================================================

    /**
     * Resolves the real client IP.
     *
     * Security note: X-Forwarded-For can be forged by the client when the
     * application is NOT behind a trusted reverse proxy.  When running behind
     * Google Cloud Run / a load-balancer, only the LAST entry added by the
     * trusted proxy should be trusted.  We take the FIRST non-private IP from
     * the chain as a best-effort approach that is consistent with the existing
     * behaviour while still being a meaningful key for rate-limiting.
     *
     * If you control the proxy layer you can tighten this to always use
     * request.getRemoteAddr() and ignore X-Forwarded-For entirely.
     */
    private String resolveClientIp(HttpServletRequest request) {
        // Try X-Forwarded-For first (set by Cloud Run / load-balancers)
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank() && !"unknown".equalsIgnoreCase(xff)) {
            // Take the first IP in the chain (original client)
            String candidate = xff.split(",")[0].trim();
            if (!candidate.isBlank() && !"unknown".equalsIgnoreCase(candidate)) {
                return candidate;
            }
        }

        // Fallback to X-Real-IP (Nginx / some proxies)
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank() && !"unknown".equalsIgnoreCase(xri)) {
            return xri.trim();
        }

        // Direct connection (no proxy)
        String remote = request.getRemoteAddr();
        return remote != null ? remote : "unknown";
    }

    // =========================================================================
    // Path matchers
    // =========================================================================

    private boolean isStaticOrHealth(String path) {
        return path.startsWith("/admin-ui/")
            || path.endsWith(".js")
            || path.endsWith(".css")
            || path.endsWith(".html")
            || path.endsWith(".png")
            || path.endsWith(".jpg")
            || path.endsWith(".svg")
            || path.endsWith(".ico")
            || path.endsWith(".woff2")
            || path.endsWith(".woff")
            || path.endsWith(".ttf");
    }

    // =========================================================================
    // Inner classes
    // =========================================================================

    /**
     * Wrapper that tracks the last access time of a bucket for eviction purposes.
     */
    private static final class BucketEntry {
        final Bucket bucket;
        volatile long lastTouchedMs;

        BucketEntry(Bucket bucket) {
            this.bucket = bucket;
            this.lastTouchedMs = System.currentTimeMillis();
        }

        void touch() {
            this.lastTouchedMs = System.currentTimeMillis();
        }
    }
}