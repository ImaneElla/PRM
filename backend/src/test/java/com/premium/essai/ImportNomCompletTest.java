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
import com.premium.essai.service.NomComplet;
import com.premium.essai.service.TableurExcel;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Fichiers avec une seule colonne « Responsable » / « Nom complet » (ex. « ERIC LEFORT ») et une colonne « Mail »
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ImportNomCompletTest {

    @Autowired private InvitationResponsableService invitationService;
    @Autowired private ImportSalarieService importSalarieService;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private SalarieRepository salarieRepository;

    private byte[] classeur(String[][] lignes) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet feuille = wb.createSheet("Feuil1");
            for (int i = 0; i < lignes.length; i++) {
                Row row = feuille.createRow(i);
                for (int c = 0; c < lignes[i].length; c++) row.createCell(c).setCellValue(lignes[i][c]);
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    @Test
    void separeLeNomCompletEnPrenomEtNom() {
        assertArrayEquals(new String[]{"Eric", "Lefort"}, NomComplet.separer("ERIC LEFORT", "Eric.LEFORT@premium.africa"));
        assertArrayEquals(new String[]{"Younes", "El Fethouni"}, NomComplet.separer("YOUNES EL FETHOUNI", "Younes.elfethouni@premium.africa"));
        assertArrayEquals(new String[]{"Youssef", "El Khlifi"}, NomComplet.separer("YOUSSEF EL KHLIFI", "Youssef.elkhlifi@premium.africa"));
        // L'e-mail prenom.nom indique que le prénom est en dernier : « LEFORT ERIC »
        assertArrayEquals(new String[]{"Eric", "Lefort"}, NomComplet.separer("LEFORT ERIC", "eric.lefort@premium.africa"));
        // Cas ambigu : on garde le premier mot comme prénom (l'utilisateur pourra corriger)
        assertArrayEquals(new String[]{"Sidi", "M Chich Alami Hassani"},
                NomComplet.separer("SIDI M CHICH ALAMI HASSANI", "MChich.alami@premium.africa"));
        // Une casse déjà correcte est conservée
        assertArrayEquals(new String[]{"Marie", "Dupont"}, NomComplet.separer("Marie Dupont", "marie.dupont@exemple.com"));
        // Un seul mot : le prénom manque
        assertArrayEquals(new String[]{"", "Madonna"}, NomComplet.separer("MADONNA", "madonna@exemple.com"));
    }

    @Test
    void importeLeFichierDesResponsablesAvecColonnesResponsableEtMail() throws Exception {
        byte[] fichier = classeur(new String[][]{
                {"Responsable", "Mail"},
                {"ERIC LEFORT", "Eric.LEFORT@premium.africa"},
                {"CHAIMAE GRINE", "chaimae.grine@premium.africa"},
                {"YOUNES EL FETHOUNI", "Younes.elfethouni@premium.africa"},
                {"SIDI M CHICH ALAMI HASSANI", "MChich.alami@premium.africa"},
        });

        List<InvitationResponsableService.LigneCsv> lignes = invitationService.lireCsv(TableurExcel.enTexte(fichier, "responsables.xlsx"));

        assertEquals(4, lignes.size());
        assertEquals("Eric", lignes.get(0).prenom());
        assertEquals("Lefort", lignes.get(0).nom());
        assertEquals("Eric.LEFORT@premium.africa", lignes.get(0).email());
        assertEquals("Chaimae", lignes.get(1).prenom());
        assertEquals("El Fethouni", lignes.get(2).nom());
        // Les numéros de ligne sont ceux d'Excel (l'en-tête est la ligne 1)
        assertEquals(2, lignes.get(0).numero());
        assertEquals(5, lignes.get(3).numero());
    }

    @Test
    void unEnTeteSansEmailNiNomEstRefuseAvecUnMessageClair() throws Exception {
        byte[] fichier = classeur(new String[][]{{"Responsable", "Telephone"}, {"ERIC LEFORT", "0600000000"}});

        // Sans colonne mail, l'en-tête n'est pas reconnu : la ligne d'en-tête est traitée comme une donnée, sans nom/e-mail valides
        List<InvitationResponsableService.LigneCsv> lignes = invitationService.lireCsv(TableurExcel.enTexte(fichier, "x.xlsx"));
        assertEquals(2, lignes.size());
        assertThrows(ResponseStatusException.class, () -> invitationService.lireCsv("nom;mail\nA;a@exemple.com\n"));
    }

    // Fichier réel : « Présentation nom », matricule, poste, responsable (par son NOM), date ; ni e-mail ni société
    @Test
    void importeLeFichierSalariesSansEmailAvecMatriculeEtResponsableParNom() throws Exception {
        Direction direction = directionRepository.save(Direction.builder().code("DIR-R").name("Direction Reel").build());
        Responsable eric = responsableRepository.save(Responsable.builder().firstName("Eric").lastName("Lefort")
                .email("eric.lefort@premium.africa").poste("Manager").direction(direction).build());
        Responsable youssef = responsableRepository.save(Responsable.builder().firstName("Youssef").lastName("El Khlifi")
                .email("youssef.elkhlifi@premium.africa").poste("Manager").direction(direction).build());
        byte[] fichier = classeur(new String[][]{
                {"Présentation nom", "Matricule", "Poste", "Responsable", "Date d'embauche"},
                {"ALEXANDRE BALENGHIEN", "GRP000059", "Directeur service maroc & ASS", "ERIC LEFORT", "2026-01-05"},
                {"ACHRAF RAYK", "PRO000038", "Technicien Implant", "YOUSSEF EL KHLIFI", "19-01-26"},
                {"OMAR EL HARAF", "PRO000039", "Technicien Implant", "EL KHLIFI Youssef", "2/1/2026"},
                {"BOUCHRA ESSADI", "SRM000604", "Responsable équipe service", "SOUAD NHAILI", "02-01-26"},
                {"Aadil EL MEKKAOUI", "SRM000605", "Responsable Ventes", "ERIC LEFORT", "23-02-26"},
        });

        List<ImportSalarieResultDTO> r = importSalarieService.importer(TableurExcel.enTexte(fichier, "salaries.xlsx"));

        assertEquals(5, r.size());
        for (int i : new int[]{0, 1, 2, 4}) {
            assertEquals("CREE", r.get(i).getStatut(), "ligne " + r.get(i).getLigne() + " : " + r.get(i).getMessage());
        }
        // Responsable absent de la base : ligne ignorée, avec son nom dans le message
        assertEquals("IGNORE", r.get(3).getStatut());
        assertTrue(r.get(3).getMessage().contains("SOUAD NHAILI"), r.get(3).getMessage());

        Salarie alexandre = salarieRepository.findByMatricule("GRP000059").orElseThrow();
        assertEquals("Alexandre", alexandre.getFirstName());
        assertEquals("Balenghien", alexandre.getLastName());
        assertEquals("GRP", alexandre.getSociete());                                      // déduite du matricule
        assertEquals("alexandrebalenghien@premium.africa", alexandre.getEmail());         // générée
        assertEquals(eric.getId(), alexandre.getResponsable().getId());
        assertEquals(LocalDate.of(2026, 1, 5), alexandre.getDateEmbauche());

        Salarie achraf = salarieRepository.findByMatricule("PRO000038").orElseThrow();
        assertEquals("PRO", achraf.getSociete());
        assertEquals(LocalDate.of(2026, 1, 19), achraf.getDateEmbauche());               // 19-01-26
        assertEquals(youssef.getId(), achraf.getResponsable().getId());
        assertEquals(LocalDate.of(2026, 1, 2), salarieRepository.findByMatricule("PRO000039").orElseThrow().getDateEmbauche());
        assertEquals(youssef.getId(), salarieRepository.findByMatricule("PRO000039").orElseThrow().getResponsable().getId());
        assertEquals("El Mekkaoui", salarieRepository.findByMatricule("SRM000605").orElseThrow().getLastName());
        assertTrue(r.get(0).getMessage().contains("alexandrebalenghien@premium.africa"), "l'adresse générée est signalée");

        // Réimporter le même fichier ne crée aucun doublon
        List<ImportSalarieResultDTO> encore = importSalarieService.importer(TableurExcel.enTexte(fichier, "salaries.xlsx"));
        assertEquals(0, encore.stream().filter(x -> "CREE".equals(x.getStatut())).count());
        assertEquals(1, salarieRepository.findAll().stream().filter(s -> "GRP000059".equals(s.getMatricule())).count());
    }

    @Test
    void importeDesSalariesAvecUneColonneNomComplet() throws Exception {
        Direction direction = directionRepository.save(Direction.builder().code("DIR-N").name("Direction Nom").build());
        responsableRepository.save(Responsable.builder().firstName("Chef").lastName("Equipe")
                .email("chef@example.com").poste("Manager").direction(direction).build());
        byte[] fichier = classeur(new String[][]{
                {"Salarié", "Mail", "Poste", "Date d'embauche"},
                {"SARA MOHSEN", "Sara.mohsen@premium.africa", "Comptable", "2026-03-02"},
        });

        List<ImportSalarieResultDTO> r = importSalarieService.importer(TableurExcel.enTexte(fichier, "salaries.xlsx"));

        assertEquals("CREE", r.get(0).getStatut(), r.get(0).getMessage());
        Salarie s = salarieRepository.findByEmail("sara.mohsen@premium.africa").orElseThrow();
        assertEquals("Sara", s.getFirstName());
        assertEquals("Mohsen", s.getLastName());
    }
}
