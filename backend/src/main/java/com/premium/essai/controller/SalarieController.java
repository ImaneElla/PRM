package com.premium.essai.controller;

import com.premium.essai.config.HeureMaroc;
import com.premium.essai.dto.ImportSalarieResultDTO;
import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.dto.SalarieResponseDTO;
import com.premium.essai.model.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.premium.essai.service.ImportSalarieService;
import com.premium.essai.service.TableurExcel;
import org.springframework.http.HttpHeaders;
import com.premium.essai.service.SalarieService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import java.util.List;

@RestController
@RequestMapping("/api/salaries")
@RequiredArgsConstructor
@Tag(name = "1. Salariés", description = "APIs de gestion des collaborateurs et de leur statut d'essai")
public class SalarieController {

    private final SalarieService salarieService;
    private final ImportSalarieService importSalarieService;

    @PostMapping
    @Operation(summary = "Créer un nouveau salarié", description = "Génère automatiquement le matricule par société et la Période 1 (3 mois)")
    public ResponseEntity<SalarieResponseDTO> createSalarie(@Valid @RequestBody SalarieRequestDTO dto) {
        return new ResponseEntity<>(salarieService.createSalarie(dto), HttpStatus.CREATED);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Importer des salariés depuis un fichier CSV",
            description = "Colonnes : nom, prénom, email, poste, date d'embauche (société, téléphone et email du responsable facultatifs). Chaque ligne est traitée indépendamment.")
    public ResponseEntity<List<ImportSalarieResultDTO>> importerSalaries(@RequestParam("fichier") MultipartFile fichier)
            throws IOException {
        if (fichier.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le fichier est vide.");
        }
        return ResponseEntity.ok(importSalarieService.importer(TableurExcel.enTexte(fichier.getBytes(), fichier.getOriginalFilename())));
    }

    @GetMapping("/modele-import")
    @Operation(summary = "Télécharger le modèle Excel d'import des salariés")
    public ResponseEntity<byte[]> modeleImport() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"modele-import-salaries.xlsx\"")
                .contentType(MediaType.parseMediaType(TableurExcel.TYPE_XLSX))
                .body(TableurExcel.modeleSalaries());
    }

    @GetMapping("/export")
    @Operation(summary = "Exporter les salariés en Excel (.xlsx)",
            description = "Données réelles de la base : salariés actifs, ou tous (archivés compris) avec inclureInactifs=true. Réservé à l'Admin RH. L'en-tête X-Nombre-Salaries indique le nombre de lignes exportées.")
    public ResponseEntity<byte[]> exporterSalaries(@RequestParam(defaultValue = "false") boolean inclureInactifs) {
        List<SalarieResponseDTO> salaries = new java.util.ArrayList<>(
                inclureInactifs ? salarieService.getAllSalaries() : salarieService.getAllSalariesActifs());
        salaries.sort(java.util.Comparator.comparing(SalarieResponseDTO::getMatricule, java.util.Comparator.nullsLast(String::compareTo)));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"salaries-" + HeureMaroc.aujourdhui() + ".xlsx\"")
                .header("X-Nombre-Salaries", String.valueOf(salaries.size()))
                .contentType(MediaType.parseMediaType(TableurExcel.TYPE_XLSX))
                .body(TableurExcel.exportSalaries(salaries));
    }

    @GetMapping
    @Operation(summary = "Lister les salariés actifs (ou tous, archivés compris, avec inclureInactifs=true)")
    public ResponseEntity<List<SalarieResponseDTO>> getAllSalariesActifs(
            @RequestParam(defaultValue = "false") boolean inclureInactifs,
            @AuthenticationPrincipal User utilisateur) {
        List<SalarieResponseDTO> salaries = inclureInactifs ? salarieService.getAllSalaries() : salarieService.getAllSalariesActifs();
        Long restreint = utilisateur.idResponsableRestreint();
        // Un responsable ne voit que les salariés qui lui sont affectés
        return ResponseEntity.ok(restreint == null ? salaries : salaries.stream()
                .filter(s -> restreint.equals(s.getResponsableId()))
                .toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir les détails d'un salarié par ID")
    public ResponseEntity<SalarieResponseDTO> getSalarieById(@PathVariable Long id, @AuthenticationPrincipal User utilisateur) {
        SalarieResponseDTO salarie = salarieService.getSalarieById(id);
        Long restreint = utilisateur.idResponsableRestreint();
        if (restreint != null && !restreint.equals(salarie.getResponsableId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce salarié n'est pas affecté à votre équipe.");
        }
        return ResponseEntity.ok(salarie);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer définitivement un salarié et ses périodes d'évaluation")
    public ResponseEntity<Void> deleteSalarie(@PathVariable Long id) {
        salarieService.deleteSalarie(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/societe")
    @Operation(summary = "Modifier la société d'un salarié et régénérer son matricule")
    public ResponseEntity<SalarieResponseDTO> updateSociete(
            @PathVariable Long id,
            @RequestParam String societe
    ) {
        return ResponseEntity.ok(salarieService.updateSociete(id, societe));
    }

    @PostMapping("/{id}/restauration")
    @Operation(summary = "Restaurer un dossier archivé", description = "Réactive le salarié, débloque les e-mails et rouvre la dernière période clôturée par la rupture")
    public ResponseEntity<SalarieResponseDTO> restaurerSalarie(@PathVariable Long id) {
        return ResponseEntity.ok(salarieService.restaurerSalarie(id));
    }

    @PostMapping("/{id}/demission")
    @Operation(summary = "Clôturer le dossier d'un salarié suite à une démission / rupture", description = "Bloque immédiatement tous les envois d'e-mails futurs")
    public ResponseEntity<Void> cloturerDemission(@PathVariable Long id, @RequestParam(required = false) String motif) {
        salarieService.cloturerDemission(id, motif);
        return ResponseEntity.noContent().build();
    }
}