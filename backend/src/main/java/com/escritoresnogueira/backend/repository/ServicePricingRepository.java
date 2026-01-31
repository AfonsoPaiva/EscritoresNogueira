package com.escritoresnogueira.backend.repository;

import com.escritoresnogueira.backend.model.ServicePricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ServicePricingRepository extends JpaRepository<ServicePricing, Long> {
    Optional<ServicePricing> findByPlano(String plano);
}