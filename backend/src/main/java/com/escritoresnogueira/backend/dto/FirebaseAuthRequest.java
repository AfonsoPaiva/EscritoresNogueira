package main.java.com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FirebaseAuthRequest {
    private String idToken;
    
    public String getIdToken() {
        return idToken;
    }
}