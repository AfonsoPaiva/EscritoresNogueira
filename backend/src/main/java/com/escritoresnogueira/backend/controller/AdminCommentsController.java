package main.java.com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.dto.BookCommentDTO;
import main.java.com.escritoresnogueira.backend.dto.CommentActionDTO;
import main.java.com.escritoresnogueira.backend.service.BookCommentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Simplified admin endpoints for comments:
 * - GET  /admin/comments/pending
 * - PUT  /admin/comments/{id}/approve
 * - PUT  /admin/comments/{id}/reject
 * - DELETE /admin/comments/{id}
 */
@Slf4j
@RestController
@RequestMapping("/admin/comments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminCommentsController {

    private final BookCommentService bookCommentService;

    @GetMapping("/pending")
    public ResponseEntity<Map<String, Object>> getPendingComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        Page<BookCommentDTO> comments = bookCommentService.getPendingComments(pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", comments.getContent());
        response.put("page", comments.getNumber());
        response.put("size", comments.getSize());
        response.put("totalElements", comments.getTotalElements());
        response.put("totalPages", comments.getTotalPages());
        response.put("pendingCount", bookCommentService.getPendingCommentCount());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{commentId}/approve")
    public ResponseEntity<Map<String, Object>> approveComment(@PathVariable Long commentId) {
        try {
            BookCommentDTO comment = bookCommentService.approveComment(commentId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Comentário aprovado com sucesso!");
            response.put("comment", comment);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Erro ao aprovar comentário: {}", e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @PutMapping("/{commentId}/reject")
    public ResponseEntity<Map<String, Object>> rejectComment(@PathVariable Long commentId) {
        try {
            BookCommentDTO comment = bookCommentService.rejectComment(commentId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Comentário rejeitado com sucesso!");
            response.put("comment", comment);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Erro ao rejeitar comentário: {}", e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Map<String, Object>> deleteComment(@PathVariable Long commentId) {
        try {
            bookCommentService.deleteComment(commentId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Comentário deletado com sucesso!");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Erro ao deletar comentário: {}", e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    /**
     * Single PUT endpoint that accepts an action in the body: { "action": "approve" | "reject" }
     * Example: PUT /admin/comments/123 with body { "action": "approve" }
     */
    @PutMapping("/{commentId}")
    public ResponseEntity<Map<String, Object>> handleAction(
            @PathVariable Long commentId,
            @RequestBody CommentActionDTO dto) {

        String action = dto != null && dto.getAction() != null ? dto.getAction().trim().toLowerCase() : null;
        if (action == null || action.isBlank()) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", false);
            resp.put("message", "Action is required: 'approve' or 'reject'");
            return ResponseEntity.badRequest().body(resp);
        }

        try {
            BookCommentDTO comment;
            if (action.equals("approve")) {
                comment = bookCommentService.approveComment(commentId);
            } else if (action.equals("reject")) {
                comment = bookCommentService.rejectComment(commentId);
            } else {
                Map<String, Object> resp = new HashMap<>();
                resp.put("success", false);
                resp.put("message", "Unknown action: use 'approve' or 'reject'");
                return ResponseEntity.badRequest().body(resp);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("comment", comment);
            response.put("action", action);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Erro ao executar ação no comentário: {}", e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
}
