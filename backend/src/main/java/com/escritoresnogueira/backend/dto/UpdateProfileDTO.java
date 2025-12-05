package main.java.com.escritoresnogueira.backend.dto;

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
    private String lastName;
    private String phone;
    private String address;
    private String postalCode;
    private String city;
    private String country;
}
