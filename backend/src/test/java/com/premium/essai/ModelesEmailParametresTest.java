package com.premium.essai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.HistoriqueEmail;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.TypeEmail;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.HistoriqueEmailRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.MailService;
import com.premium.essai.service.SalarieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Modification des modèles d'e-mail depuis Paramètres : prise en compte à l'envoi, validation, réinitialisation, droits
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ModelesEmailParametresTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private PeriodeEvaluationRepository periodeRepository;
    @Autowired private HistoriqueEmailRepository historiqueRepository;
    @Autowired private SalarieService salarieService;
    @Autowired private MailService mailService;

    @MockBean private JavaMailSender mailSender;

    private String admin;
    private PeriodeEvaluation periode;
    private Long salarieId;

    @BeforeEach
    void init() throws Exception {
        when(mailSender.createMimeMessage()).thenThrow(new MailSendException("SMTP désactivé pour le test"));
        Direction direction = directionRepository.save(Direction.builder().code("DIR-P").name("Direction Param").build());
        Responsable responsable = responsableRepository.save(Responsable.builder()
                .firstName("Karim").lastName("Bennani").email("karim.bennani@example.com")
                .poste("Manager").direction(direction).build());
        salarieId = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Sara").lastName("Alaoui").email("sara-" + UUID.randomUUID() + "@example.com")
                .poste("Comptable").dateEmbauche(LocalDate.now().minusDays(10))
                .directionId(direction.getId()).responsableId(responsable.getId()).build()).getId();
        periode = periodeRepository.findBySalarieId(salarieId).get(0);
        admin = jeton(creerCompte("admin", UserRole.ADMIN_RH));
    }

    @Test
    void listeLesModelesAvecLeursChamps() throws Exception {
        mockMvc.perform(get("/api/parametres/modeles-email").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[0].id").value("email_j21"))
                .andExpect(jsonPath("$[3].id").value("email_retard"))
                .andExpect(jsonPath("$[4].id").value("email_evaluation_recue"))
                .andExpect(jsonPath("$[0].personnalise").value(false))
                .andExpect(jsonPath("$[0].champs[0]").value("{nom_manager}"));
    }

    @Test
    void unModeleModifieEstUtiliseALEnvoiPuisRetabli() throws Exception {
        mockMvc.perform(put("/api/parametres/modeles-email/email_j21").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "objet", "Évaluation de {nom_salarie}",
                                "contenu", "Bonjour {nom_manager}, évaluez {nom_salarie} avant le {date_limite}. Accès : {lien_evaluation}"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personnalise").value(true));

        mailService.sendRappelJ21(periode);
        HistoriqueEmail envoye = historiqueRepository.findBySalarieId(salarieId).stream()
                .filter(e -> e.getTypeEmail() == TypeEmail.EMAIL_1_PREMIER_RAPPEL).findFirst().orElseThrow();
        assertEquals("Évaluation de Sara Alaoui", envoye.getObjet());
        assertTrue(envoye.getContenuCorps().startsWith("Bonjour Karim Bennani, évaluez Sara Alaoui avant le "));
        assertTrue(envoye.getContenuCorps().contains("/evaluation/" + periode.getTokenAccesSalarie()));

        // Rétablir le texte par défaut
        mockMvc.perform(post("/api/parametres/modeles-email/email_j21/reinitialiser").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personnalise").value(false))
                .andExpect(jsonPath("$.contenu").value(org.hamcrest.Matchers.containsString("prendra fin le {date_echeance}")));
    }

    @Test
    void refuseLesChampsInconnusEtLesTextesVides() throws Exception {
        mockMvc.perform(put("/api/parametres/modeles-email/email_j21").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("objet", "Objet", "contenu", "Bonjour {prenom_inconnu}"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("{prenom_inconnu}")));

        mockMvc.perform(put("/api/parametres/modeles-email/email_j21").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("objet", "  ", "contenu", "Texte"))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/parametres/modeles-email/inconnu").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("objet", "Objet", "contenu", "Texte"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void reserveAAdminRH() throws Exception {
        String responsable = jeton(creerCompte("resp", UserRole.RESPONSABLE));

        mockMvc.perform(get("/api/parametres/modeles-email").header("Authorization", responsable))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/parametres/modeles-email/email_j21").header("Authorization", responsable)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("objet", "x", "contenu", "y"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/parametres/modeles-email"))
                .andExpect(status().is4xxClientError());
    }

    private String creerCompte(String prefixe, UserRole role) {
        String email = prefixe + "-" + UUID.randomUUID() + "@example.com";
        userRepository.save(User.builder().nom("Test").prenom("User").email(email)
                .password(passwordEncoder.encode("Secret1234")).role(role).build());
        return email;
    }

    private String jeton(String email) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(email).password("Secret1234").build())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        return "Bearer " + json.get("token").asText();
    }
}
