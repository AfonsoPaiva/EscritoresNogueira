package main.java.com.escritoresnogueira.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handle Content-Type not supported errors
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        
        log.error("[GlobalExceptionHandler] Content-Type not supported: {} for {} {}", 
                ex.getContentType(), request.getMethod(), request.getRequestURI());
        log.error("[GlobalExceptionHandler] Supported types: {}", ex.getSupportedMediaTypes());
        
        Map<String, Object> body = createErrorResponse(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE.value(),
            "Content-Type not supported",
            String.format("Content-Type '%s' is not supported. Please use 'application/json'", ex.getContentType()),
            request.getRequestURI()
        );
        
        return ResponseEntity
                .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    /**
     * Handle JSON parsing errors
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleMessageNotReadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        
        log.error("[GlobalExceptionHandler] JSON parsing error for {} {}: {}", 
                request.getMethod(), request.getRequestURI(), ex.getMessage());
        
        Map<String, Object> body = createErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "Invalid JSON",
            "Request body contains invalid JSON. Please check the format.",
            request.getRequestURI()
        );
        
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    /**
     * Handle validation errors
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        
        log.error("[GlobalExceptionHandler] Validation error for {} {}", 
                request.getMethod(), request.getRequestURI());
        
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
            log.debug("[GlobalExceptionHandler] Field '{}': {}", error.getField(), error.getDefaultMessage());
        });
        
        Map<String, Object> body = createErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "Validation failed",
            "One or more fields have invalid values",
            request.getRequestURI()
        );
        body.put("fieldErrors", fieldErrors);
        
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    /**
     * Handle 404 Not Found
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            NoHandlerFoundException ex, HttpServletRequest request) {
        
        log.warn("[GlobalExceptionHandler] Endpoint not found: {} {}", 
                request.getMethod(), request.getRequestURI());
        
        Map<String, Object> body = createErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            "Endpoint not found",
            String.format("No handler found for %s %s", ex.getHttpMethod(), ex.getRequestURL()),
            request.getRequestURI()
        );
        
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    /**
     * Handle IllegalArgumentException
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        
        log.error("[GlobalExceptionHandler] Illegal argument for {} {}: {}", 
                request.getMethod(), request.getRequestURI(), ex.getMessage());
        
        Map<String, Object> body = createErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "Invalid request",
            ex.getMessage(),
            request.getRequestURI()
        );
        
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    /**
     * Handle all other exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(
            Exception ex, HttpServletRequest request) {
        
        log.error("[GlobalExceptionHandler] Unhandled exception for {} {}: {}", 
                request.getMethod(), request.getRequestURI(), ex.getMessage(), ex);
        
        Map<String, Object> body = createErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "Internal server error",
            "An unexpected error occurred. Please try again later.",
            request.getRequestURI()
        );
        
        // In debug mode, include exception details
        body.put("exception", ex.getClass().getSimpleName());
        body.put("exceptionMessage", ex.getMessage());
        
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    /**
     * Create a standardized error response
     */
    private Map<String, Object> createErrorResponse(int status, String error, String message, String path) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        body.put("error", error);
        body.put("message", message);
        body.put("path", path);
        return body;
    }
}
