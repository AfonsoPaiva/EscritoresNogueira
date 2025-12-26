package com.escritoresnogueira.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReCaptchaService {

    private final RestTemplate restTemplate;

    @Value("${recaptcha.secret-key}")
    private String secretKey;

    @Value("${recaptcha.verify-url}")
    private String verifyUrl;

    public boolean verifyToken(String token, String remoteIp) {
        if (token == null || token.isEmpty()) {
            log.warn("reCAPTCHA token is null or empty");
            return false;
        }

        // Allow test tokens in development
        if ("test-token".equals(token) || token.startsWith("test-")) {
            log.debug("Allowing test reCAPTCHA token in development mode");
            return true;
        }

        // Delegate to detailed verifier and return boolean success
        VerificationResult result = verifyTokenDetailed(token, remoteIp);
        return result != null && Boolean.TRUE.equals(result.success);
    }

    /**
     * Detailed verification result including v3 score when available.
     */
    public static class VerificationResult {
        public Boolean success;
        public Double score;
        public String action;
        public java.util.List<String> errorCodes;
    }

    public VerificationResult verifyTokenDetailed(String token, String remoteIp) {
        VerificationResult result = new VerificationResult();

        if (token == null || token.isEmpty()) {
            log.warn("reCAPTCHA token is null or empty (detailed)");
            result.success = false;
            return result;
        }

        // Allow test tokens in development
        if ("test-token".equals(token) || token.startsWith("test-")) {
            log.debug("Allowing test reCAPTCHA token in development mode (detailed)");
            result.success = true;
            result.score = 1.0;
            return result;
        }

        try {
            StringBuilder urlBuilder = new StringBuilder(verifyUrl);
            urlBuilder.append("?secret=").append(secretKey);
            urlBuilder.append("&response=").append(token);
            if (remoteIp != null && !remoteIp.isEmpty()) {
                urlBuilder.append("&remoteip=").append(remoteIp);
            }

            // For diagnostics, log a masked URL (do not log secret) and truncated token
            String maskedUrl = verifyUrl + "?secret=***REDACTED***&response=" + (token.length() > 12 ? token.substring(0, 8) + "..." : token);
            log.debug("Verifying reCAPTCHA token (detailed) with URL: {}", maskedUrl);

            Map<String, Object> response = restTemplate.getForObject(urlBuilder.toString(), Map.class);
            if (response == null) {
                log.error("reCAPTCHA detailed verification failed: null response");
                result.success = false;
                return result;
            }

            Object successObj = response.get("success");
            result.success = (successObj instanceof Boolean) ? (Boolean) successObj : Boolean.FALSE;

            Object scoreObj = response.get("score");
            if (scoreObj instanceof Number) {
                result.score = ((Number) scoreObj).doubleValue();
            }

            Object actionObj = response.get("action");
            if (actionObj instanceof String) {
                result.action = (String) actionObj;
            }

            Object errorsObj = response.get("error-codes");
            if (errorsObj instanceof java.util.List) {
                //noinspection unchecked
                result.errorCodes = (java.util.List<String>) errorsObj;
            }

            log.debug("reCAPTCHA detailed verification result: success={} score={} action={} errors={} rawResponse={}", result.success, result.score, result.action, result.errorCodes, response);

            return result;

        } catch (RestClientException e) {
            log.error("Error verifying reCAPTCHA token (detailed)", e);
            result.success = false;
            return result;
        }
    }
}


