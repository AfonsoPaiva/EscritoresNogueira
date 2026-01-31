package com.escritoresnogueira.backend.service;

import com.escritoresnogueira.backend.dto.ServicosPrecosDTO;
import com.escritoresnogueira.backend.model.ServicePricing;
import com.escritoresnogueira.backend.repository.ServicePricingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServicePricingService {

    private final ServicePricingRepository servicePricingRepository;

    public List<ServicosPrecosDTO> getAllServicePricing() {
        return servicePricingRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Optional<ServicosPrecosDTO> getServicePricingByPlano(String plano) {
        return servicePricingRepository.findByPlano(plano)
                .map(this::convertToDTO);
    }

    @Transactional
    public ServicosPrecosDTO updateServicePricing(String plano, ServicosPrecosDTO dto) {
        ServicePricing pricing = servicePricingRepository.findByPlano(plano)
                .orElseThrow(() -> new IllegalArgumentException("Service plan '" + plano + "' not found. Only existing plans can be updated."));

        pricing.setPrecoAtual(dto.getPrecoAtual());
        pricing.setPrecoAntigo(dto.getPrecoAntigo());
        pricing.setDescontoPercentagem(dto.getDescontoPercentagem());
        pricing.setEmPromocao(dto.isEmPromocao());
        pricing.setDescricaoPromocao(dto.getDescricaoPromocao());

        ServicePricing saved = servicePricingRepository.save(pricing);
        return convertToDTO(saved);
    }

    @Transactional
    public void initializeDefaultPricing() {
        // Define the only allowed service plans
        String[] planos = {"essencial", "profissional", "premium"};
        BigDecimal[] precos = {new BigDecimal("199"), new BigDecimal("399"), new BigDecimal("699")};

        // Create only the default pricing records if they don't exist
        int createdCount = 0;
        for (int i = 0; i < planos.length; i++) {
            // Check if plan already exists
            Optional<ServicePricing> existing = servicePricingRepository.findByPlano(planos[i]);
            if (existing.isEmpty()) {
                ServicePricing pricing = ServicePricing.builder()
                        .plano(planos[i])
                        .precoAtual(precos[i])
                        .precoAntigo(null)
                        .descontoPercentagem(0)
                        .emPromocao(false)
                        .descricaoPromocao(null)
                        .build();
                servicePricingRepository.save(pricing);
                createdCount++;
            }
        }

        if (createdCount > 0) {
            log.info("Initialized {} new service pricing plans", createdCount);
        } else {
            log.info("All service pricing plans already exist, skipping initialization");
        }
    }

    private ServicosPrecosDTO convertToDTO(ServicePricing pricing) {
        return ServicosPrecosDTO.builder()
                .plano(pricing.getPlano())
                .precoAtual(pricing.getPrecoAtual())
                .precoAntigo(pricing.getPrecoAntigo())
                .descontoPercentagem(pricing.getDescontoPercentagem())
                .emPromocao(pricing.isEmPromocao())
                .descricaoPromocao(pricing.getDescricaoPromocao())
                .build();
    }
}