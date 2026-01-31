package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.escritoresnogueira.backend.model.AuthProvider;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {
    private String email;
    private String name;
    private String firstName;
    private String phone;
    private String address;
    private String postalCode;
    private String city;
    private String country;
    private String residenceType; // "Casa" or "Apartamento"
    private String floor; // Andar (optional, for Apartamento)
    private String doorNumber; // Número da Porta (optional, for Apartamento)
    private String notes; // Notas para endereço
    private String photoUrl;
    private LocalDateTime createdAt;
    private AuthProvider authProvider;
    private Boolean enabled;
}


