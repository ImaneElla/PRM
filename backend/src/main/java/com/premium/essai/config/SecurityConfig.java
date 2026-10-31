package com.premium.essai.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/error").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Réservé à l'Admin RH : annuaire des responsables, comptes admins, journaux, réglages, décisions
                        .requestMatchers("/api/responsables/**").hasRole("ADMIN_RH")
                        .requestMatchers("/api/admins/**").hasRole("ADMIN_RH")
                        .requestMatchers("/api/outils/**").hasRole("ADMIN_RH")
                        .requestMatchers("/api/dashboard/audit-emails").hasRole("ADMIN_RH")
                        .requestMatchers("/api/test/**").hasRole("ADMIN_RH")
                        .requestMatchers(HttpMethod.PUT, "/api/parametres").hasRole("ADMIN_RH")
                        .requestMatchers(HttpMethod.POST, "/api/periodes/**").hasRole("ADMIN_RH")
                        .requestMatchers("/api/parametres/modeles-email/**").hasRole("ADMIN_RH")
                        .requestMatchers(HttpMethod.POST, "/api/evaluations/*/decision-directe-rh").hasRole("ADMIN_RH")
                        // Gestion des salariés (création, import, suppression, société, démission) : Admin RH uniquement.
                        // La lecture (GET) reste ouverte aux responsables, filtrée sur leur équipe dans le contrôleur.
                        .requestMatchers(HttpMethod.POST, "/api/salaries/**").hasRole("ADMIN_RH")
                        .requestMatchers(HttpMethod.PUT, "/api/salaries/**").hasRole("ADMIN_RH")
                        .requestMatchers(HttpMethod.PATCH, "/api/salaries/**").hasRole("ADMIN_RH")
                        .requestMatchers(HttpMethod.DELETE, "/api/salaries/**").hasRole("ADMIN_RH")
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${application.cors-allowed-origins}") List<String> origines) {
        CorsConfiguration configuration = new CorsConfiguration();
        // Patterns acceptés (ex. http://192.168.*:3000) ; liste modifiable via CORS_ALLOWED_ORIGINS
        configuration.setAllowedOriginPatterns(origines);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}