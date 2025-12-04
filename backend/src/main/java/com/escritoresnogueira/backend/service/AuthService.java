package main.java.com.escritoresnogueira.backend.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.dto.AuthResponse;
import main.java.com.escritoresnogueira.backend.dto.RegisterRequest;
import main.java.com.escritoresnogueira.backend.model.AuthProvider;
import main.java.com.escritoresnogueira.backend.model.User;
import main.java.com.escritoresnogueira.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    
    public AuthResponse authenticateWithFirebase(String firebaseIdToken) {
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance()
                .verifyIdToken(firebaseIdToken);
            
            String firebaseUid = decodedToken.getUid();
            String email = decodedToken.getEmail();
            String name = decodedToken.getName();
            String photoUrl = decodedToken.getPicture();
            
            AuthProvider provider = detectProvider(decodedToken);

            User user = userRepository.findByAuthProviderId(firebaseUid)
                .orElseGet(() -> {
                    // Se não encontrar pelo ID do Firebase, tenta pelo email
                    return userRepository.findByEmail(email)
                        .map(existingUser -> {
                            // Atualiza o usuário existente com o ID do Firebase
                            log.info("🔗 Vinculando conta existente ao Firebase: {}", email);
                            existingUser.setAuthProviderId(firebaseUid);
                            existingUser.setAuthProvider(provider);
                            return userRepository.save(existingUser);
                        })
                        .orElseGet(() -> createNewUser(firebaseUid, email, name, photoUrl, provider));
                });
            
            user.setName(name != null ? name : user.getName());
            user.setPhotoUrl(photoUrl != null ? photoUrl : user.getPhotoUrl());
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
            
            log.info(" Usuário autenticado: {} ({})", email, provider);

            return AuthResponse.builder()
                .email(user.getEmail())
                .name(user.getName())
                .user(user)
                .build();
            
        } catch (FirebaseAuthException e) {
            log.error(" Token Firebase inválido: {}", e.getMessage());
            throw new RuntimeException("Token inválido ou expirado");
        } catch (Exception e) {
            log.error(" Erro na autenticação: {}", e.getMessage());
            throw new RuntimeException("Erro ao autenticar usuário");
        }
    }
    
    public AuthResponse registerUser(RegisterRequest request) {
        try {
            // Criar usuário no Firebase Authentication
            UserRecord.CreateRequest createRequest = new UserRecord.CreateRequest()
                .setEmail(request.getEmail())
                .setPassword(request.getPassword())
                .setDisplayName(request.getName())
                .setEmailVerified(false)
                .setDisabled(false);
            
            UserRecord userRecord = FirebaseAuth.getInstance().createUser(createRequest);
            
            log.info("🆕 Usuário criado no Firebase: {} ({})", request.getEmail(), userRecord.getUid());
            
            // Criar usuário no PostgreSQL
            User user = User.builder()
                .authProviderId(userRecord.getUid())
                .email(request.getEmail())
                .name(request.getName())
                .authProvider(AuthProvider.FIREBASE)
                .enabled(true)
                .roles(Set.of("ROLE_USER"))
                .lastLogin(LocalDateTime.now())
                .build();
            
            userRepository.save(user);
            
            log.info("✅ Usuário registado com sucesso: {}", request.getEmail());

            return AuthResponse.builder()
                .email(user.getEmail())
                .name(user.getName())
                .user(user)
                .build();
            
        } catch (FirebaseAuthException e) {
            log.error("❌ Erro ao criar usuário no Firebase: {}", e.getMessage());
            if (e.getAuthErrorCode().name().equals("EMAIL_ALREADY_EXISTS")) {
                throw new RuntimeException("Email já registado");
            }
            throw new RuntimeException("Erro ao registar usuário: " + e.getMessage());
        } catch (Exception e) {
            log.error("❌ Erro ao registar usuário: {}", e.getMessage());
            throw new RuntimeException("Erro ao registar usuário");
        }
    }
    
    private User createNewUser(String firebaseUid, String email, String name, 
                               String photoUrl, AuthProvider provider) {
        log.info("🆕 Criando novo usuário: {}", email);
        
        User newUser = User.builder()
            .authProviderId(firebaseUid)
            .email(email)
            .name(name != null ? name : email.split("@")[0])
            .photoUrl(photoUrl)
            .authProvider(provider)
            .enabled(true)
            .roles(Set.of("ROLE_USER"))
            .build();
        
        return userRepository.save(newUser);
    }
    
    private AuthProvider detectProvider(FirebaseToken token) {
        if (token.getIssuer().contains("google")) {
            return AuthProvider.GOOGLE;
        } else if (token.getIssuer().contains("facebook")) {
            return AuthProvider.FACEBOOK;
        } else {
            return AuthProvider.FIREBASE; 
        }
    }
    
    public void promoteToAdmin(String firebaseUid) {
        User user = userRepository.findByAuthProviderId(firebaseUid)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        
        user.getRoles().add("ROLE_ADMIN");
        userRepository.save(user);
        
        log.info(" Usuário {} promovido a ADMIN", user.getEmail());
    }

    public void deleteUser(String firebaseUid) {
        User user = userRepository.findByAuthProviderId(firebaseUid)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        
        log.info("🗑️ Eliminando usuário e dados associados: {} ({})", user.getEmail(), firebaseUid);
        
        // 1. Delete from PostgreSQL
        userRepository.delete(user);
        log.info("✅ Usuário eliminado com sucesso do banco de dados");

        // 2. Delete from Firebase Auth
        try {
            FirebaseAuth.getInstance().deleteUser(firebaseUid);
            log.info("✅ Usuário eliminado com sucesso do Firebase Auth");
        } catch (FirebaseAuthException e) {
            log.error("⚠️ Erro ao eliminar usuário do Firebase Auth: {}", e.getMessage());
        }
    }
}