package com.premium.essai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.premium.essai.controller.OutilsDonneesController;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.repository.TemplateEmailRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.SalarieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Outil temporaire « vider les données » : protégé par un réglage, un rôle et une phrase de confirmation
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "application.outils.reinitialisation-donnees=true")
@Transactional
class OutilViderDonneesTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private SalarieRepository salarieRepository;
    @Autowired private PeriodeEvaluationRepository periodeRepository;
    @Autowired private TemplateEmailRepository templateRepository;
    @Autowired private SalarieService salarieService;
    @Autowired private OutilsDonneesController outil;

    private String emailAdmin;

    @BeforeEach
    void init() {
        Direction direction = directionRepository.save(Direction.builder().code("DIR-V").name("Direction Vider").build());
        Responsable respo = responsableRepository.save(Responsable.builder().firstName("Resp").lastName("v")
                .email("resp-" + UUID.randomUUID() + "@example.com").poste("Manager").direction(direction).build());
        userRepository.save(User.builder().nom("Resp").prenom("v").email(respo.getEmail())
                .password(passwordEncoder.encode("Secret1234")).role(UserRole.RESPONSABLE).responsable(respo).build());
        salarieService.createSalarie(SalarieRequestDTO.builder().firstName("Sara").lastName("Alaoui")
                .email("sara-" + UUID.randomUUID() + "@example.com").poste("Dev").dateEmbauche(LocalDate.now().minusDays(5))
                .directionId(direction.getId()).responsableId(respo.getId()).build());
        emailAdmin = "admin-" + UUID.randomUUID() + "@example.com";
        userRepository.save(User.builder().nom("Admin").prenom("Test").email(emailAdmin)
                .password(passwordEncoder.encode("Secret1234")).role(UserRole.ADMIN_RH).build());
    }

    private String jeton(String email) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(email).password("Secret1234").build())))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        return "Bearer " + json.get("token").asText();
    }

    @Test
    void videLesDonneesMetierEtConserveAdminsEtModeles() throws Exception {
        String admin = jeton(emailAdmin);
        long modeles = templateRepository.count();

        mockMvc.perform(get("/api/outils/donnees/etat").header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.actif").value(true));

        // Mauvaise phrase de confirmation : rien n'est supprimé
        mockMvc.perform(post("/api/outils/donnees/vider").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of("confirmation", "oui"))))
                .andExpect(status().isBadRequest());
        assertTrue(salarieRepository.count() > 0);

        mockMvc.perform(post("/api/outils/donnees/vider").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of("confirmation", "VIDER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.salaries").value(1))
                .andExpect(jsonPath("$.comptesResponsables").value(1));

        assertEquals(0, salarieRepository.count());
        assertEquals(0, periodeRepository.count());
        assertEquals(0, responsableRepository.count());
        assertEquals(0, directionRepository.count());
        assertEquals(0, userRepository.findByRole(UserRole.RESPONSABLE).size());
        // Conservés : le compte admin (on peut encore s'en servir) et les modèles d'e-mail
        assertTrue(userRepository.findByEmailIgnoreCase(emailAdmin).isPresent());
        assertEquals(modeles, templateRepository.count());
    }

    @Test
    void reserveAAdminRHEtDesactivableParReglage() throws Exception {
        mockMvc.perform(post("/api/outils/donnees/vider")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"confirmation\":\"VIDER\"}"))
                .andExpect(status().is4xxClientError());

        String admin = jeton(emailAdmin);
        ReflectionTestUtils.setField(outil, "actif", false);
        try {
            mockMvc.perform(get("/api/outils/donnees/etat").header("Authorization", admin))
                    .andExpect(jsonPath("$.actif").value(false));
            mockMvc.perform(post("/api/outils/donnees/vider").header("Authorization", admin)
                            .contentType(MediaType.APPLICATION_JSON).content("{\"confirmation\":\"VIDER\"}"))
                    .andExpect(status().isNotFound());
            assertTrue(salarieRepository.count() > 0, "outil désactivé : rien n'est supprimé");
        } finally {
            ReflectionTestUtils.setField(outil, "actif", true);
        }
    }
}
