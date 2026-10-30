package com.premium.essai.dto;

import com.premium.essai.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    
    @Builder.Default
    private String type = "Bearer";
    
    private Long id;
    private String email;
    private String nom;
    private String prenom;
    private UserRole role;

    // Vrai si le compte doit choisir un nouveau mot de passe avant d'accéder à l'application
    private boolean mustChangePassword;
}