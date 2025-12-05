package com.escritoresnogueira.backend;

import main.java.com.escritoresnogueira.backend.model.User;
import io.github.cdimascio.dotenv.Dotenv;
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

import java.util.Set;

@SpringBootApplication
@EnableCaching
@EnableJpaAuditing
@EnableScheduling
@ComponentScan(basePackages = {"com.escritoresnogueira.backend", "main.java.com.escritoresnogueira.backend"})
@EnableJpaRepositories(basePackages = {"com.escritoresnogueira.backend.repository", "main.java.com.escritoresnogueira.backend.repository"})
@EntityScan(basePackages = {"com.escritoresnogueira.backend.model", "main.java.com.escritoresnogueira.backend.model"})
public class EscritoresNogueiraBackendApplication {

    // Carrega .env no carregamento da classe — também será executado durante os testes
    static {
        try {
            Dotenv dotenv = Dotenv.configure()
                    .ignoreIfMissing()
                    .load();

            // define como properties do sistema para que Spring resolva placeholders
            dotenv.entries().forEach(entry ->
                    System.setProperty(entry.getKey(), entry.getValue())
            );

            System.out.println("Loaded .env (if present)");
        } catch (Exception e) {
            System.out.println("Warning: falha ao carregar .env: " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        // Carregar .env automaticamente (mantido por compatibilidade)
        Dotenv dotenv = Dotenv.configure()
            .ignoreIfMissing()
            .load();

        // Definir como propriedades do sistema para Spring Boot
        dotenv.entries().forEach(entry -> 
            System.setProperty(entry.getKey(), entry.getValue())
        );

        // Definir perfil ativo
            String profile = System.getProperty("SPRING_PROFILES_ACTIVE", "dev");
        System.setProperty("spring.profiles.active", profile);
        
        SpringApplication.run(EscritoresNogueiraBackendApplication.class, args);
        
        // Obter valores do .env para exibir URLs corretas
        String port = System.getProperty("SERVER_PORT", "8080");
        String contextPath = System.getProperty("SERVER_CONTEXT_PATH", "/api");
        String actuatorPath = System.getProperty("ACTUATOR_BASE_PATH", "/actuator");
        
        System.out.println("\n==============================================");
        System.out.println("  Escritores Nogueira Backend está a correr!");
        System.out.println("  API: http://localhost:" + port + contextPath);
        System.out.println("  Health: http://localhost:" + port + contextPath + actuatorPath + "/health");
        System.out.println("==============================================\n");
    }
}