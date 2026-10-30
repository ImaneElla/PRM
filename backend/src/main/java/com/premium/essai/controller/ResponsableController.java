package com.premium.essai.controller;

import com.premium.essai.dto.InvitationResultDTO;
import com.premium.essai.dto.ResponsableDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.InvitationResponsableService;
import com.premium.essai.service.TableurExcel;
import org.springframework.http.HttpHeaders;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/responsables")
@RequiredArgsConstructor
public class ResponsableController {
    private static final List<String> SOCIETES = List.of("GRP", "PRO", "SRM", "AFI", "CCI", "SCP");

    private final ResponsableRepository responsableRepository;
    private final DirectionRepository directionRepository;
    private final SalarieRepository salarieRepository;
    private final PeriodeEvaluationRepository periodeRepository;
    private final UserRepository userRepository;
    private final InvitationResponsableService invitationService;

    @GetMapping
    public ResponseEntity<List<ResponsableDTO>> getAllResponsables() {
        return ResponseEntity.ok(responsableRepository.findAll().stream().map(this::toDto).toList());
    }

    // Formulaire express : crée le responsable et son compte, puis envoie l'invitation (Admin RH uniquement)
    @PostMapping("/invitations")
    public ResponseEntity<InvitationResultDTO> inviterResponsable(@Valid @RequestBody ResponsableDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(invitationService.inviter(dto.getFirstName(), dto.getLastName(), dto.getEmail(), dto.getSociete()));
    }

    @GetMapping("/modele-import")
    public ResponseEntity<byte[]> modeleImport() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"modele-import-responsables.xlsx\"")
                .contentType(MediaType.parseMediaType(TableurExcel.TYPE_XLSX))
                .body(TableurExcel.modeleResponsables());
    }

    // Import en masse : une invitation par ligne (nom, prénom, email), chaque ligne est traitée indépendamment
    @PostMapping(value = "/invitations/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<InvitationResultDTO>> importerResponsables(@RequestParam("fichier") MultipartFile fichier)
            throws IOException {
        if (fichier.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le fichier est vide.");
        }
        List<InvitationResultDTO> resultats = new ArrayList<>();
        for (var ligne : invitationService.lireCsv(TableurExcel.enTexte(fichier.getBytes(), fichier.getOriginalFilename()))) {
            InvitationResultDTO resultat;
            try {
                resultat = invitationService.inviter(ligne.prenom(), ligne.nom(), ligne.email(), ligne.societe());
            } catch (ResponseStatusException e) {
                resultat = InvitationResultDTO.builder().statut("IGNORE").message(e.getReason()).build();
            } catch (RuntimeException e) {
                resultat = InvitationResultDTO.builder().statut("ERREUR").message("Erreur inattendue : " + e.getMessage()).build();
            }
            resultat.setLigne(ligne.numero());
            if (resultat.getEmail() == null) resultat.setEmail(ligne.email());
            if (resultat.getNomComplet() == null) resultat.setNomComplet((ligne.prenom() + " " + ligne.nom()).trim());
            resultats.add(resultat);
        }
        return ResponseEntity.ok(resultats);
    }

    // Invite un responsable existant sans compte, ou renvoie un nouveau mot de passe temporaire
    @PostMapping("/{id}/invitation")
    public ResponseEntity<InvitationResultDTO> inviterResponsableExistant(@PathVariable Long id) {
        return ResponseEntity.ok(invitationService.inviterExistant(id));
    }

    @PostMapping
    public ResponseEntity<ResponsableDTO> createResponsable(@Valid @RequestBody ResponsableDTO dto) {
        ensureEmailIsAvailable(dto.getEmail(), null);
        Responsable responsable = new Responsable();
        apply(dto, responsable);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(responsableRepository.save(responsable)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponsableDTO> updateResponsable(
            @PathVariable Long id,
            @Valid @RequestBody ResponsableDTO dto
    ) {
        Responsable responsable = responsableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Responsable introuvable."));
        ensureEmailIsAvailable(dto.getEmail(), id);
        apply(dto, responsable);
        return ResponseEntity.ok(toDto(responsableRepository.save(responsable)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResponsable(@PathVariable Long id) {
        Responsable responsable = responsableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Responsable introuvable."));
        if (salarieRepository.existsByResponsableId(id) || periodeRepository.existsByResponsableId(id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce responsable possède encore des salariés ou des périodes d'évaluation."
            );
        }
        // Le compte de connexion du responsable est supprimé avec lui
        userRepository.findByEmailIgnoreCase(responsable.getEmail())
                .filter(user -> user.getRole() == UserRole.RESPONSABLE)
                .ifPresent(userRepository::delete);
        responsableRepository.delete(responsable);
        return ResponseEntity.noContent().build();
    }

    private void apply(ResponsableDTO dto, Responsable responsable) {
        responsable.setFirstName(dto.getFirstName().trim());
        responsable.setLastName(dto.getLastName().trim());
        responsable.setEmail(dto.getEmail().trim().toLowerCase(Locale.ROOT));
        responsable.setPhone(dto.getPhone());
        responsable.setPoste(dto.getPoste());
        responsable.setSociete(normalizeSociete(dto.getSociete()));
        Direction direction = directionRepository.findAll().stream().findFirst()
                .orElseGet(() -> directionRepository.save(Direction.builder()
                        .name("Direction Générale")
                        .code("DG")
                        .description("Affectation interne historique")
                        .build()));
        responsable.setDirection(direction);
        responsable.setDirectionName(direction.getName());
    }

    private void ensureEmailIsAvailable(String email, Long currentId) {
        responsableRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(existing -> !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette adresse e-mail est déjà utilisée.");
                });
    }

    private String normalizeSociete(String societe) {
        String normalized = societe == null || societe.isBlank()
                ? "GRP"
                : societe.trim().toUpperCase(Locale.ROOT);
        if (!SOCIETES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Société invalide.");
        }
        return normalized;
    }

    private ResponsableDTO toDto(Responsable responsable) {
        ResponsableDTO dto = new ResponsableDTO();
        dto.setId(responsable.getId());
        dto.setFirstName(responsable.getFirstName());
        dto.setLastName(responsable.getLastName());
        dto.setEmail(responsable.getEmail());
        dto.setPhone(responsable.getPhone());
        dto.setPoste(responsable.getPoste());
        dto.setSociete(normalizeSociete(responsable.getSociete()));
        dto.setStatutCompte(invitationService.statutCompte(responsable));
        return dto;
    }
}
