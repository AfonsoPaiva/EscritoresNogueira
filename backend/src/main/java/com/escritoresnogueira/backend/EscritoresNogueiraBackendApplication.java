package com.escritoresnogueira.backend;

import com.escritoresnogueira.backend.service.ServicePricingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@EnableCaching
@EnableJpaAuditing
@EnableScheduling
@ComponentScan(basePackages = {"com.escritoresnogueira.backend", "main.java.com.escritoresnogueira.backend"})
@EnableJpaRepositories(basePackages = {"com.escritoresnogueira.backend.repository", "main.java.com.escritoresnogueira.backend.repository"})
@EntityScan(basePackages = {"com.escritoresnogueira.backend.model", "main.java.com.escritoresnogueira.backend.model"})
public class EscritoresNogueiraBackendApplication {

    @Autowired
    private ServicePricingService servicePricingService;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public CommandLineRunner initializeServicePricing() {
        return args -> {
            try {
                servicePricingService.initializeDefaultPricing();
                System.out.println("Preços dos serviços inicializados com sucesso!");
            } catch (Exception e) {
                System.err.println("Erro ao inicializar preços dos serviços: " + e.getMessage());
            }
        };
    }

    public static void main(String[] args) {
        SpringApplication.run(EscritoresNogueiraBackendApplication.class, args);
        
        System.out.println("\n==============================================");
        System.out.println("  Escritores Nogueira Backend está a correr!");
        System.out.println("  API: http://localhost:8080/api");
        System.out.println("  Health: http://localhost:8080/api/actuator/health");
        System.out.println("==============================================\n");
    }
}


