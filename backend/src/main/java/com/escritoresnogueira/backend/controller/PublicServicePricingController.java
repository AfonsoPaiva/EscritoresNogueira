package com.escritoresnogueira.backend.controller;

import com.escritoresnogueira.backend.dto.ServicosPrecosDTO;
import com.escritoresnogueira.backend.service.ServicePricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/public/servicos-precos")
@RequiredArgsConstructor
public class PublicServicePricingController {

    private final ServicePricingService servicePricingService;

    @GetMapping
    public ResponseEntity<List<ServicosPrecosDTO>> getAllServicePricing() {
        List<ServicosPrecosDTO> pricing = servicePricingService.getAllServicePricing();
        return ResponseEntity.ok(pricing);
    }

    @GetMapping("/{plano}")
    public ResponseEntity<ServicosPrecosDTO> getServicePricing(@PathVariable String plano) {
        Optional<ServicosPrecosDTO> pricing = servicePricingService.getServicePricingByPlano(plano);
        return pricing.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}