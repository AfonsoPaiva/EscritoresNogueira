package main.java.com.escritoresnogueira.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;


@Data
@Builder
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "users")
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity implements UserDetails {
    
    @Column(unique = true, nullable = false)
    private String email;
    private String name;
    
    @Column(name = "auth_provider_id", unique = true, nullable = false)
    private String authProviderId;
    
    @Column(name = "photo_url")
    private String photoUrl;
    
    // Extended profile fields
    @Column(name = "first_name")
    private String firstName;
    
    @Column(name = "last_name")
    private String lastName;
    
    @Column(name = "phone")
    private String phone;
    
    @Column(name = "address")
    private String address;
    
    @Column(name = "postal_code")
    private String postalCode;
    
    @Column(name = "city")
    private String city;
    
    @Column(name = "country")
    @Builder.Default
    private String country = "Portugal";
    
    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider")
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.FIREBASE;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Builder.Default
    private Set<String> roles = Set.of("ROLE_USER");

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;
    
    private LocalDateTime lastLogin;
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }
    
    @Override
    public String getUsername() {
        return email;
    }
    
    @Override
    public String getPassword() {
        return "";
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return enabled;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}