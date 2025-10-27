package main.java.com.escritoresnogueira.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.credentials-path}")
    private String credentialsPath;

    @Value("${firebase.project-id}")
    private String projectId;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            log.info(" Inicializando Firebase com credenciais: {}", credentialsPath);
            
            Resource resource = new FileSystemResource(credentialsPath);
            
            if (!resource.exists()) {
                log.error(" Arquivo de credenciais do Firebase não encontrado: {}", credentialsPath);
                throw new IOException("Firebase credentials file not found: " + credentialsPath);
            }

            try (InputStream serviceAccount = resource.getInputStream()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .setProjectId(projectId)
                        .build();

                FirebaseApp app = FirebaseApp.initializeApp(options);
                log.info(" Firebase Admin SDK inicializado com sucesso! Project ID: {}", projectId);
                return app;
            }
        }
        
        log.info(" Firebase App já inicializado");
        return FirebaseApp.getInstance();
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}