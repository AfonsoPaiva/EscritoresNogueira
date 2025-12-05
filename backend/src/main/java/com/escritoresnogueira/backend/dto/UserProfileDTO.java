package main.java.com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {
    private String email;
    private String name;
    private String firstName;
    private String lastName;
    private String phone;
    private String address;
    private String postalCode;
    private String city;
    private String country;
    private String photoUrl;
    private LocalDateTime createdAt;
}
