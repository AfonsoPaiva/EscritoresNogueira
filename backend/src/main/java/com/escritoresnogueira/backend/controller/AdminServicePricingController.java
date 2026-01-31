package com.escritoresnogueira.backend.controller;

import com.escritoresnogueira.backend.dto.ServicosPrecosDTO;
import com.escritoresnogueira.backend.service.ServicePricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/servicos-precos")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminServicePricingController {

    private final ServicePricingService servicePricingService;

    @GetMapping
    public ResponseEntity<List<ServicosPrecosDTO>> getAllServicePricing() {
        List<ServicosPrecosDTO> pricing = servicePricingService.getAllServicePricing();
        return ResponseEntity.ok(pricing);
    }

    @GetMapping("/{plano}")
    public ResponseEntity<ServicosPrecosDTO> getServicePricing(@PathVariable String plano) {
        return servicePricingService.getServicePricingByPlano(plano)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{plano}")
    public ResponseEntity<ServicosPrecosDTO> updateServicePricing(
            @PathVariable String plano,
            @RequestBody ServicosPrecosDTO dto) {
        try {
            ServicosPrecosDTO updated = servicePricingService.updateServicePricing(plano, dto);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Erro ao atualizar preço do serviço: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}