package com.premium.essai.controller;

import com.premium.essai.dto.AuthResponse;
import com.premium.essai.dto.MotDePasseRequests;
import com.premium.essai.dto.ResponsableDTO;
import com.premium.essai.model.Responsable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.premium.essai.model.User;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
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
    private final ResponsableRepository responsableRepository;

    // Fiche du responsable connecté (et d'elle seule) : l'annuaire complet est réservé à l'Admin RH
    @GetMapping("/moi")
    @Transactional(readOnly = true)
    public ResponseEntity<ResponsableDTO> moi(@AuthenticationPrincipal User user) {
        // L'objet utilisateur issu du jeton est détaché : on relit la fiche par son identifiant
        Long idResponsable = user.idResponsableRestreint();
        Responsable responsable = idResponsable == null || idResponsable < 0 ? null
                : responsableRepository.findById(idResponsable).orElse(null);
        if (responsable == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucune fiche responsable n'est liée à ce compte.");
        }
        ResponsableDTO dto = new ResponsableDTO();
        dto.setId(responsable.getId());
        dto.setFirstName(responsable.getFirstName());
        dto.setLastName(responsable.getLastName());
        dto.setEmail(responsable.getEmail());
        dto.setPhone(responsable.getPhone());
        dto.setPoste(responsable.getPoste());
        dto.setSociete(responsable.getSociete());
        dto.setStatutCompte("ACTIF");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/mot-de-passe")
    public ResponseEntity<AuthResponse> changerMotDePasse(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody MotDePasseRequests.Changement request) {
        return ResponseEntity.ok(authService.changerMotDePasse(user, request.motDePasseActuel(), request.nouveauMotDePasse()));
    }
}
