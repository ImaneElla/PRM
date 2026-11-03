package com.premium.essai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.dto.SalarieResponseDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.SalarieService;
import com.premium.essai.service.TableurExcel;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Export Excel des salariés : on ouvre le classeur renvoyé par la vraie route et on vérifie les lignes réelles de la base
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ExportSalariesExcelTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private SalarieService salarieService;

    @MockBean private JavaMailSender mailSender;

    private String admin;
    private String responsable;
    private SalarieResponseDTO accentue;
    private SalarieResponseDTO minimal;

    @BeforeEach
    void init() throws Exception {
        when(mailSender.createMimeMessage()).thenThrow(new org.springframework.mail.MailSendException("SMTP désactivé"));
        Direction direction = directionRepository.save(Direction.builder().code("DIR-X").name("Direction Export").build());
        Responsable respo = responsableRepository.save(Responsable.builder().firstName("Karim").lastName("Bennani")
                .email("karim-" + UUID.randomUUID() + "@example.com").poste("Manager").direction(direction).build());

        admin = jeton(compte(UserRole.ADMIN_RH, null));
        responsable = jeton(compte(UserRole.RESPONSABLE, respo));

        accentue = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Hélène-Zoé").lastName("D'Aubigné & Fils <ß>").phone("0612345678")
                .email("helene-" + UUID.randomUUID() + "@example.com")
                .poste("=Chargée d'études ; R&D").dateEmbauche(LocalDate.of(2026, 9, 1))
                .directionId(direction.getId()).responsableId(respo.getId()).build());
        // Champs facultatifs absents : pas de téléphone
        minimal = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Ali").lastName("Benali")
                .email("ali-" + UUID.randomUUID() + "@example.com")
                .poste("Comptable").dateEmbauche(LocalDate.of(2026, 10, 15))
                .directionId(direction.getId()).responsableId(respo.getId()).build());
    }

    private String compte(UserRole role, Responsable respo) {
        String email = role.name().toLowerCase() + "-" + UUID.randomUUID() + "@example.com";
        userRepository.save(User.builder().nom("Test").prenom("User").email(email)
                .password(passwordEncoder.encode("Secret1234")).role(role).responsable(respo).build());
        return email;
    }

    private String jeton(String email) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(email).password("Secret1234").build())))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        return "Bearer " + json.get("token").asText();
    }

    /* Lignes de données de la feuille « Salariés », indexées par e-mail (colonne D). */
    private static Map<String, Row> lignesParEmail(Sheet feuille) {
        Map<String, Row> lignes = new HashMap<>();
        for (int i = 1; i <= feuille.getLastRowNum(); i++) {
            Row ligne = feuille.getRow(i);
            lignes.put(ligne.getCell(3).getStringCellValue(), ligne);
        }
        return lignes;
    }

    @Test
    void lExportContientLesVraisSalariesDeLaBase() throws Exception {
        int attendus = salarieService.getAllSalariesActifs().size();
        assertTrue(attendus >= 2, "la base doit contenir au moins les 2 salariés du test");

        MvcResult resultat = mockMvc.perform(get("/api/salaries/export").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(TableurExcel.TYPE_XLSX))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.matchesPattern("attachment; filename=\"salaries-\\d{4}-\\d{2}-\\d{2}\\.xlsx\"")))
                .andExpect(header().string("X-Nombre-Salaries", String.valueOf(attendus)))
                .andReturn();

        byte[] octets = resultat.getResponse().getContentAsByteArray();
        System.out.println("[export] taille=" + octets.length + " octets, salariés attendus=" + attendus);
        try (Workbook classeur = WorkbookFactory.create(new ByteArrayInputStream(octets))) {
            Sheet feuille = classeur.getSheet("Salariés");
            assertNotNull(feuille);
            assertEquals("Matricule", feuille.getRow(0).getCell(0).getStringCellValue());
            assertEquals(attendus, feuille.getLastRowNum(), "une ligne par salarié actif sous l'en-tête");
            System.out.println("[export] lignes de données dans la feuille=" + feuille.getLastRowNum());

            Map<String, Row> lignes = lignesParEmail(feuille);

            // Accents, apostrophe, &, <, ;, et valeur commençant par « = » : restitués tels quels, en texte
            Row a = lignes.get(accentue.getEmail());
            assertNotNull(a, "le salarié accentué doit être exporté");
            assertEquals(accentue.getMatricule(), a.getCell(0).getStringCellValue());
            assertEquals("D'Aubigné & Fils <ß>", a.getCell(1).getStringCellValue());
            assertEquals("Hélène-Zoé", a.getCell(2).getStringCellValue());
            Cell poste = a.getCell(4);
            assertEquals(org.apache.poi.ss.usermodel.CellType.STRING, poste.getCellType(), "jamais une formule");
            assertEquals("=Chargée d'études ; R&D", poste.getStringCellValue());
            assertTrue(DateUtil.isCellDateFormatted(a.getCell(6)), "date d'embauche = vraie date Excel");
            assertEquals(LocalDate.of(2026, 9, 1), a.getCell(6).getLocalDateTimeCellValue().toLocalDate());
            assertEquals("Karim Bennani", a.getCell(8).getStringCellValue());
            assertEquals("Oui", a.getCell(11).getStringCellValue());

            // Le téléphone n'est pas exporté : ni colonne, ni valeur
            Row enTete = feuille.getRow(0);
            for (int c = 0; c < enTete.getLastCellNum(); c++) {
                assertFalse(enTete.getCell(c).getStringCellValue().toLowerCase().contains("téléphone"));
                Cell valeur = a.getCell(c);
                assertFalse(valeur != null && valeur.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING
                        && valeur.getStringCellValue().contains("0612345678"));
            }

            // Salarié sans champ facultatif : exporté normalement
            Row m = lignes.get(minimal.getEmail());
            assertNotNull(m);
            assertEquals(LocalDate.of(2026, 10, 15), m.getCell(6).getLocalDateTimeCellValue().toLocalDate());
        }
    }

    @Test
    void lesSalariesArchivesNeSontExportesQuAvecInclureInactifs() throws Exception {
        salarieService.cloturerDemission(minimal.getId(), "Démission");

        MvcResult actifs = mockMvc.perform(get("/api/salaries/export").header("Authorization", admin))
                .andExpect(status().isOk()).andReturn();
        MvcResult tous = mockMvc.perform(get("/api/salaries/export?inclureInactifs=true").header("Authorization", admin))
                .andExpect(status().isOk()).andReturn();

        try (Workbook c1 = WorkbookFactory.create(new ByteArrayInputStream(actifs.getResponse().getContentAsByteArray()));
             Workbook c2 = WorkbookFactory.create(new ByteArrayInputStream(tous.getResponse().getContentAsByteArray()))) {
            assertFalse(lignesParEmail(c1.getSheetAt(0)).containsKey(minimal.getEmail()));
            Row archive = lignesParEmail(c2.getSheetAt(0)).get(minimal.getEmail());
            assertNotNull(archive);
            assertEquals("Non", archive.getCell(11).getStringCellValue());
            assertEquals(salarieService.getAllSalaries().size(), c2.getSheetAt(0).getLastRowNum());
        }
    }

    @Test
    void sansSalarieLeClasseurEstValideAvecSeulementLEnTete() throws Exception {
        byte[] octets = TableurExcel.exportSalaries(List.of());
        assertEquals('P', octets[0]);
        assertEquals('K', octets[1]);
        try (Workbook classeur = WorkbookFactory.create(new ByteArrayInputStream(octets))) {
            Sheet feuille = classeur.getSheet("Salariés");
            assertEquals(0, feuille.getLastRowNum(), "seulement la ligne d'en-tête");
            assertNull(feuille.getRow(1));
        }
    }

    @Test
    void lExportEstReserveALAdminRh() throws Exception {
        mockMvc.perform(get("/api/salaries/export").header("Authorization", responsable))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/salaries/export"))
                .andExpect(result -> assertTrue(result.getResponse().getStatus() == 401 || result.getResponse().getStatus() == 403,
                        "sans jeton : " + result.getResponse().getStatus()));
    }
}
