package com.premium.essai;

import com.premium.essai.dto.ImportSalarieResultDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.Salarie;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.service.ImportSalarieService;
import com.premium.essai.service.InvitationResponsableService;
import com.premium.essai.service.TableurExcel;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Import Excel (.xlsx) des salariés et des responsables, et modèles téléchargeables
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ImportExcelTest {

    @Autowired private ImportSalarieService importSalarieService;
    @Autowired private InvitationResponsableService invitationService;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private SalarieRepository salarieRepository;

    @BeforeEach
    void init() {
        Direction direction = directionRepository.save(Direction.builder().code("DIR-X").name("Direction Excel").build());
        responsableRepository.save(Responsable.builder()
                .firstName("Karim").lastName("Bennani").email("karim.bennani@example.com")
                .poste("Manager").direction(direction).build());
    }

    private byte[] classeur(Object[][] lignes, int colonneDate) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet feuille = wb.createSheet("Salariés");
            CellStyle styleDate = wb.createCellStyle();
            styleDate.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));
            for (int i = 0; i < lignes.length; i++) {
                if (lignes[i] == null) continue; // ligne vide
                Row row = feuille.createRow(i);
                for (int c = 0; c < lignes[i].length; c++) {
                    Object v = lignes[i][c];
                    if (v instanceof LocalDate d) {
                        row.createCell(c).setCellValue(d);
                        row.getCell(c).setCellStyle(styleDate);
                    } else if (v instanceof Number n) {
                        row.createCell(c).setCellValue(n.doubleValue());
                    } else if (v != null) {
                        row.createCell(c).setCellValue(v.toString());
                    }
                }
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    @Test
    void importeUnVraiFichierExcelAvecDatesAccentsEtLignesVides() throws Exception {
        byte[] fichier = classeur(new Object[][]{
                {"nom", "prénom", "email", "poste", "date d'embauche", "société", "téléphone"},
                {"Élément", "Zoë", "ZOE@Example.com", "Ingénieure", LocalDate.of(2026, 1, 15), "PRO", 612345678},
                null,
                {"Alaoui", "Sara", "sara.excel@example.com", "Comptable", LocalDate.of(2026, 2, 2), "", ""},
                {"Sans", "Poste", "sanspost.excel@example.com", "", LocalDate.of(2026, 2, 2), "GRP", ""},
        }, 4);

        List<ImportSalarieResultDTO> r = importSalarieService.importer(TableurExcel.enTexte(fichier, "salaries.xlsx"));

        assertEquals(3, r.size());
        assertEquals("CREE", r.get(0).getStatut(), r.get(0).getMessage());
        assertEquals("CREE", r.get(1).getStatut(), r.get(1).getMessage());
        assertEquals("IGNORE", r.get(2).getStatut());
        // Les numéros de ligne sont ceux d'Excel (la ligne vide compte)
        assertEquals(2, r.get(0).getLigne());
        assertEquals(4, r.get(1).getLigne());
        assertEquals(5, r.get(2).getLigne());

        Salarie zoe = salarieRepository.findByEmail("zoe@example.com").orElseThrow();
        assertEquals("Élément", zoe.getLastName());
        assertEquals(LocalDate.of(2026, 1, 15), zoe.getDateEmbauche());
        assertEquals("PRO", zoe.getSociete());
        assertEquals("612345678", zoe.getPhone());
        assertEquals("GRP", salarieRepository.findByEmail("sara.excel@example.com").orElseThrow().getSociete());
    }

    @Test
    void leModeleSalariesNeContientQueLesEntetes() {
        byte[] modele = TableurExcel.modeleSalaries();
        String texte = TableurExcel.enTexte(modele, "modele-import-salaries.xlsx");

        // Aucun salarié fictif dans le modèle : seules les colonnes sont fournies, et elles sont toutes reconnues à l'import
        assertTrue(texte.startsWith("nom;prénom;email;poste;date d'embauche;"), texte);
        assertEquals(1, texte.lines().filter(l -> !l.isBlank()).count());
        assertTrue(importSalarieService.importer(texte).isEmpty());
    }

    @Test
    void leModeleResponsablesEstLisibleParLImportDesResponsables() {
        String texte = TableurExcel.enTexte(TableurExcel.modeleResponsables(), "modele-import-responsables.xlsx");

        List<InvitationResponsableService.LigneCsv> lignes = invitationService.lireCsv(texte);

        assertEquals(1, lignes.size());
        assertEquals("Dupont", lignes.get(0).nom());
        assertEquals("Marie", lignes.get(0).prenom());
        assertEquals("marie.dupont@exemple.com", lignes.get(0).email());
        assertEquals("GRP", lignes.get(0).societe());
    }

    @Test
    void unFichierCsvResteAccepte() {
        String csv = "nom;prénom;email;poste;date d'embauche\nBennis;Hamza;csv.compat@example.com;Juriste;2026-03-03\n";

        List<ImportSalarieResultDTO> r = importSalarieService.importer(
                TableurExcel.enTexte(csv.getBytes(StandardCharsets.UTF_8), "ancien-format.csv"));

        assertEquals("CREE", r.get(0).getStatut(), r.get(0).getMessage());
    }

    @Test
    void unFichierExcelIllisibleEstRefuseProprement() {
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> TableurExcel.enTexte("ceci n'est pas un classeur".getBytes(StandardCharsets.UTF_8), "faux.xlsx"));

        assertTrue(e.getReason().contains("Excel illisible"));
    }
}
