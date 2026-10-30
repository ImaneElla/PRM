package com.premium.essai.controller;

import com.premium.essai.dto.AuthResponse;
import com.premium.essai.dto.MotDePasseRequests;
import com.premium.essai.model.User;
import com.premium.essai.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/compte")
@RequiredArgsConstructor
public class CompteController {

    public static final String CHEMIN_CHANGEMENT_MOT_DE_PASSE = "/api/compte/mot-de-passe";

    private final AuthService authService;

    @PostMapping("/mot-de-passe")
    public ResponseEntity<AuthResponse> changerMotDePasse(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody MotDePasseRequests.Changement request) {
        return ResponseEntity.ok(authService.changerMotDePasse(user, request.motDePasseActuel(), request.nouveauMotDePasse()));
    }
}
