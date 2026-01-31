package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingDTO {
    private String firstName;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String postalCode;
    private String country;
    private String residenceType; // "Casa" or "Apartamento"
    private String floor; // Andar (optional, for Apartamento)
    private String doorNumber; // Número da Porta (optional, for Apartamento)
    private String notes;
}
