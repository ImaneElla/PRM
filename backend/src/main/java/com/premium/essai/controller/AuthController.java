package com.premium.essai.controller;

import com.premium.essai.dto.AuthResponse;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.dto.MotDePasseRequests;
import com.premium.essai.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// Pas d'inscription publique : les comptes responsables sont créés par l'Admin RH (invitations)
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Login endpoint
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // Réponse identique que l'adresse existe ou non, pour ne pas révéler les comptes
    @PostMapping("/mot-de-passe-oublie")
    public ResponseEntity<Map<String, String>> motDePasseOublie(@Valid @RequestBody MotDePasseRequests.Oubli request) {
        authService.demanderReinitialisation(request.email());
        return ResponseEntity.ok(Map.of("message",
                "Si un compte correspond à cette adresse, un lien de réinitialisation vient d'être envoyé."));
    }

    @PostMapping("/reinitialiser-mot-de-passe")
    public ResponseEntity<Map<String, String>> reinitialiserMotDePasse(
            @Valid @RequestBody MotDePasseRequests.Reinitialisation request) {
        authService.reinitialiserMotDePasse(request.token(), request.nouveauMotDePasse());
        return ResponseEntity.ok(Map.of("message", "Votre mot de passe a été réinitialisé."));
    }
}
