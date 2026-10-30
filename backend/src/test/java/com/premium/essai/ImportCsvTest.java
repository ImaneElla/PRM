package com.premium.essai;

import com.premium.essai.dto.ImportSalarieResultDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.Salarie;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.service.CsvEncodage;
import com.premium.essai.service.ImportSalarieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Import CSV de salariés : accents, séparateurs, formats de date, doublons, erreurs ligne par ligne
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ImportCsvTest {

    private static final String EN_TETE = "nom;prénom;email;poste;date d'embauche;société;téléphone;responsable\n";

    @Autowired private ImportSalarieService importService;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private SalarieRepository salarieRepository;

    private Responsable responsable;

    @BeforeEach
    void init() {
        Direction direction = directionRepository.save(Direction.builder().code("DIR-I").name("Direction Import").build());
        responsable = responsableRepository.save(Responsable.builder()
                .firstName("Karim").lastName("Bennani").email("karim.bennani@example.com")
                .poste("Manager").direction(direction).build());
    }

    @Test
    void importeAccentsPointVirguleEtDateFrancaise() {
        List<ImportSalarieResultDTO> r = importService.importer(
                EN_TETE + "Élément;Zoë;ZOE@Example.com;Ingénieure;15/01/2026;PRO;0612345678;karim.bennani@example.com\n");

        assertEquals(1, r.size());
        assertEquals("CREE", r.get(0).getStatut(), r.get(0).getMessage());
        assertEquals(2, r.get(0).getLigne());
        Salarie s = salarieRepository.findByEmail("zoe@example.com").orElseThrow();
        assertEquals("Élément", s.getLastName());
        assertEquals("Zoë", s.getFirstName());
        assertEquals(LocalDate.of(2026, 1, 15), s.getDateEmbauche());
        assertEquals("PRO", s.getSociete());
        assertTrue(s.getMatricule().startsWith("PRO"));
        assertEquals(responsable.getId(), s.getResponsable().getId());
    }

    @Test
    void importeVirguleGuillemetsDateIsoEtBomExcel() {
        String csv = "﻿nom,prénom,email,poste,date d'embauche\n"
                + "\"Alaoui\",\"Sara\",sara.alaoui@example.com,Comptable,2026-02-02\n";

        List<ImportSalarieResultDTO> r = importService.importer(csv);

        assertEquals("CREE", r.get(0).getStatut(), r.get(0).getMessage());
        Salarie s = salarieRepository.findByEmail("sara.alaoui@example.com").orElseThrow();
        assertEquals("GRP", s.getSociete());
        assertEquals(LocalDate.of(2026, 2, 2), s.getDateEmbauche());
    }

    @Test
    void colonnesDansUnAutreOrdreSontReconnuesParLeurEntete() {
        String csv = "email;poste;date d'embauche;nom;prénom\n"
                + "ordre@example.com;Juriste;03-03-2026;Bennis;Hamza\n";

        List<ImportSalarieResultDTO> r = importService.importer(csv);

        assertEquals("CREE", r.get(0).getStatut(), r.get(0).getMessage());
        Salarie s = salarieRepository.findByEmail("ordre@example.com").orElseThrow();
        assertEquals("Bennis", s.getLastName());
        assertEquals("Hamza", s.getFirstName());
    }

    @Test
    void doublonsEtLignesInvalidesSontIgnoresSansBloquerLesAutres() {
        String csv = EN_TETE
                + "Premier;Un;doublon@example.com;Dev;2026-01-10;GRP;;\n"
                + "Second;Deux;DOUBLON@example.com;Dev;2026-01-10;GRP;;\n"      // même e-mail dans le fichier
                + "Sans;Date;sansdate@example.com;Dev;;GRP;;\n"                   // date manquante
                + "Mauvaise;Date;baddate@example.com;Dev;31/02/2026;GRP;;\n"     // date impossible
                + "Mauvaise;Societe;badsoc@example.com;Dev;2026-01-10;XXX;;\n"   // société inconnue
                + "Sans;Poste;sanspost@example.com;;2026-01-10;GRP;;\n"          // poste manquant
                + "Email;Faux;pas-un-email;Dev;2026-01-10;GRP;;\n"               // e-mail invalide
                + "Resp;Inconnu;respinconnu@example.com;Dev;2026-01-10;GRP;;personne@example.com\n"
                + "Dernier;Ok;dernier@example.com;Dev;2026-01-10;SRM;;\n";

        List<ImportSalarieResultDTO> r = importService.importer(csv);

        assertEquals(9, r.size());
        assertEquals("CREE", r.get(0).getStatut());
        for (int i = 1; i <= 7; i++) {
            assertEquals("IGNORE", r.get(i).getStatut(), "ligne " + r.get(i).getLigne() + " : " + r.get(i).getMessage());
        }
        assertTrue(r.get(1).getMessage().contains("existe déjà"));
        assertEquals("CREE", r.get(8).getStatut(), r.get(8).getMessage());
        // Une seule fiche pour l'adresse en doublon
        assertEquals(1, salarieRepository.findAll().stream().filter(s -> s.getEmail().equalsIgnoreCase("doublon@example.com")).count());
    }

    @Test
    void enTeteSansColonneObligatoireEstRefuse() {
        assertThrows(ResponseStatusException.class, () -> importService.importer("nom;email\nA;a@example.com\n"));
    }

    @Test
    void fichierTropGrosEstRefuse() {
        StringBuilder csv = new StringBuilder(EN_TETE);
        for (int i = 0; i <= ImportSalarieService.MAX_LIGNES_CSV; i++) {
            csv.append("N").append(i).append(";P;u").append(i).append("@example.com;Dev;2026-01-10;GRP;;\n");
        }
        assertThrows(ResponseStatusException.class, () -> importService.importer(csv.toString()));
    }

    @Test
    void detecteLesFichiersExcelEnWindows1252() {
        String texte = "Élément;Zoë;été";

        assertEquals(texte, CsvEncodage.decoder(texte.getBytes(StandardCharsets.UTF_8)));
        assertEquals(texte, CsvEncodage.decoder(texte.getBytes(Charset.forName("windows-1252"))));
    }
}
