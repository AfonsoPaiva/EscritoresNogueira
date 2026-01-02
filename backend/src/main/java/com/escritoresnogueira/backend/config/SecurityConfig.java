package com.escritoresnogueira.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

import static org.springframework.security.config.Customizer.withDefaults;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final AdminAuthenticationProvider adminAuthenticationProvider;
    private final AdminIapFilter adminIapFilter;
    private final RateLimitFilter rateLimitFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
            .ignoringRequestMatchers(
                "/auth/**",      // Endpoints de autenticação
                "/health/**",    // Health checks
                "/books/**",     // Endpoints públicos de livros
                "/blog/**",      // Endpoints públicos de blog
                "/session/**",   // Endpoints de sessão
                "/user/**",      // Endpoints de utilizador
                "/payments/**",  // Payments endpoints (checkout session preflight)
                "/form-submissions", "/form-submissions/**", // Public form submissions (no CSRF)
                "/admin/api/login", "/admin/api/logout", // Admin form-login endpoints (skip CSRF)
                "/admin/**" // Admin API endpoints used by SPA (session token auth handled separately)
            )
)
            // Comment out requiresChannel - Cloud Run handles HTTPS termination
            // .requiresChannel(channel -> channel.anyRequest().requiresSecure())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .headers(headers -> headers
                .contentSecurityPolicy("frame-ancestors 'self' https://www.google.com; frame-src 'self' https://www.google.com https://accounts.google.com https://escritores-nogueira.firebaseapp.com https://www.recaptcha.net https://www.gstatic.com; script-src 'self' 'unsafe-inline' https://www.google.com https://apis.google.com https://www.recaptcha.net https://www.gstatic.com https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm https://storage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm; img-src 'self' data: https://www.google.com https://www.recaptcha.net https://www.gstatic.com https://storage.googleapis.com; connect-src 'self' https://www.google.com https://apis.google.com https://www.recaptcha.net https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://storage.googleapis.com https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm https://www.gstatic.com")
            )
            .authorizeHttpRequests(auth -> auth
                // PÚBLICO: Endpoints de autenticação
                .requestMatchers(
                    "/auth/register",
                    "/auth/firebase",
                    "/auth/firebase-config",
                    "/auth/recaptcha-config",
                    "/auth/subscribe-newsletter",
                    "/auth/unsubscribe-newsletter",
                    "/auth/health",
                    "/auth/user",    // Permitir endpoint de exclusão (verificação feita no controller)
                    "/auth/dev/**",
                    "/auth/forgot-password",
                    "/auth/resend-verification"
                ).permitAll()
                
                // PÚBLICO: Health check
                .requestMatchers(
                    "/health",
                    "/actuator/health"
                ).permitAll()
                
                // PÚBLICO: Livros (todos os endpoints)
                .requestMatchers("/books", "/books/**").permitAll()
                
                // PÚBLICO: Blog
                .requestMatchers("/blog/**").permitAll()

                // Error page (forwarded) - allow anonymous so error forwarding doesn't trigger 403
                .requestMatchers("/error", "/error/**").permitAll()
                
                // SESSION: Endpoints de sessão (validação feita no controller via session token)
                .requestMatchers("/session/**").permitAll()
                
                // USER: Endpoints de utilizador (validação feita no controller via session token)
                .requestMatchers("/user/**").permitAll()
                
                // PAYMENTS: allow creating checkout sessions and preflight
                .requestMatchers("/payments/**").permitAll()
                
                // PUBLIC: Form submissions (frontend posts here without auth)
                .requestMatchers("/form-submissions", "/form-submissions/**").permitAll()
                
                // PUBLIC: Service pricing (for frontend dynamic pricing)
                .requestMatchers("/public/servicos-precos", "/public/servicos-precos/**").permitAll()
                
                    // ADMIN ONLY: Administração (API)
                    .requestMatchers("/admin/**").hasRole("ADMIN")
                    // Admin UI (static) - serve UI files publicly, protect APIs instead
                    .requestMatchers("/admin-ui/**").permitAll()
                
                // AUTENTICADO: Tudo o resto
                .anyRequest().authenticated()
            )
            // Register custom admin AuthenticationProvider
            .authenticationProvider(adminAuthenticationProvider)
            // Allow IAP header-based auth (when behind Google IAP)
            .addFilterBefore(adminIapFilter, UsernamePasswordAuthenticationFilter.class)
            // Add rate limiting filter
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            // Use Spring Security form login for admin (stateful session)
            .formLogin(form -> form
                .loginProcessingUrl("/admin/api/login")
                .usernameParameter("username")
                .passwordParameter("password")
                .successHandler((req, res, auth) -> {
                    res.setStatus(200);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"status\":\"ok\"}");
                })
                .failureHandler((req, res, ex) -> {
                    res.setStatus(401);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":\"invalid_credentials\"}");
                })
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/admin/api/logout")
                .logoutSuccessHandler((req, res, auth) -> {
                    res.setStatus(200);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"status\":\"logged_out\"}");
                })
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:4200",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:5501",
            "http://127.0.0.1:5501",
            "https://escritoresnogueira.com",
            "https://www.escritoresnogueira.com"
        ));

        // Allow origin patterns as a fallback for local dev hosts (supports wildcards)
        configuration.setAllowedOriginPatterns(List.of("*"));
        
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}


