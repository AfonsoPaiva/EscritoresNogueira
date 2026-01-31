package com.escritoresnogueira.backend.controller;

import com.escritoresnogueira.backend.dto.FormSubmissionDTO;
import com.escritoresnogueira.backend.service.FormSubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/form-submissions")
@RequiredArgsConstructor
@Slf4j
public class AdminFormSubmissionController {

    private final FormSubmissionService service;

    @GetMapping
    public ResponseEntity<Page<FormSubmissionDTO>> list(@RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "20") int size) {
        Page<FormSubmissionDTO> p = service.findAll(page, size);
        return ResponseEntity.ok(p);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormSubmissionDTO> get(@PathVariable Long id) {
        FormSubmissionDTO dto = service.findById(id);
        if (dto == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        log.debug("[AdminFormSubmissionController] DELETE /admin/form-submissions/{}", id);
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
