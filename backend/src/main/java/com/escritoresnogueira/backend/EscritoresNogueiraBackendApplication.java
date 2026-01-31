package com.escritoresnogueira.backend;

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

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    public static void main(String[] args) {
        SpringApplication.run(EscritoresNogueiraBackendApplication.class, args);
        
        System.out.println("\n==============================================");
        System.out.println("  Escritores Nogueira Backend");
        System.out.println("  VERSION 10.0.0");
        System.out.println("==============================================\n");
    }
}


