package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileDTO {
    private String firstName;
    private String email;
    private String phone;
    private String address;
    private String postalCode;
    private String city;
    private String country;
    private String residenceType;
    private String floor;
    private String doorNumber;
    private String notes;
}


