package com.premium.essai.controller;

import com.premium.essai.model.ParametresCompte;
import com.premium.essai.repository.ParametresCompteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/parametres")
@RequiredArgsConstructor
public class ParametresController {

    private final ParametresCompteRepository parametresCompteRepository;

    @Value("${application.mail-sender:}")
    private String expediteurParDefaut;

    @GetMapping
    public ResponseEntity<ParametresCompte> getParametres() {
        ParametresCompte params = parametresCompteRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> ParametresCompte.builder()
                        .nomExpediteur("Direction RH - Groupe Premium")
                        .emailExpediteur(expediteurParDefaut)
                        .build());
        return ResponseEntity.ok(params);
    }

    @PutMapping
    public ResponseEntity<ParametresCompte> updateParametres(@RequestBody ParametresCompte request) {
        ParametresCompte params = parametresCompteRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> ParametresCompte.builder().build());

        if (request.getNomExpediteur() != null && !request.getNomExpediteur().isBlank()) {
            params.setNomExpediteur(request.getNomExpediteur());
        }
        if (request.getEmailExpediteur() != null && !request.getEmailExpediteur().isBlank()) {
            params.setEmailExpediteur(request.getEmailExpediteur());
        }

        ParametresCompte saved = parametresCompteRepository.save(params);
        return ResponseEntity.ok(saved);
    }
}
