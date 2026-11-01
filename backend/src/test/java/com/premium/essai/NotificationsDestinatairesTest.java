package com.premium.essai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.premium.essai.dto.EvaluationDetailRequestDTO;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.HistoriqueEmail;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.RecommandationEvaluateur;
import com.premium.essai.model.enums.RoleDestinataire;
import com.premium.essai.model.enums.TypeEmail;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.HistoriqueEmailRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.EvaluationService;
import com.premium.essai.service.NotificationEcheanceService;
import com.premium.essai.service.SalarieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Qui est prévenu quand un responsable remplit l'évaluation : tous les admins actifs (e-mail + notification),
// et le responsable concerné seulement (confirmation + notification)
@Import(HistoriqueEmailTestConfig.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificationsDestinatairesTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private PeriodeEvaluationRepository periodeRepository;
    @Autowired private HistoriqueEmailRepository historiqueRepository;
    @Autowired private SalarieService salarieService;
    @Autowired private EvaluationService evaluationService;
    @Autowired private NotificationEcheanceService cron;

    // L'envoi SMTP échoue immédiatement : le contenu généré est quand même enregistré dans l'historique
    @MockBean private JavaMailSender mailSender;

    private String emailAdminA, emailAdminB, emailAdminInactif, emailRespoA, emailRespoB;
    private Long salarieId;
    private PeriodeEvaluation periode;

    @BeforeEach
    void init() {
        when(mailSender.createMimeMessage()).thenThrow(new MailSendException("SMTP désactivé pour le test"));
        Direction direction = directionRepository.save(Direction.builder().code("DIR-N").name("Direction Notif").build());
        Responsable respoA = creerResponsable("a", direction);
        Responsable respoB = creerResponsable("b", direction);

        emailAdminA = creerCompte("admin-a", UserRole.ADMIN_RH, null, true);
        emailAdminB = creerCompte("admin-b", UserRole.ADMIN_RH, null, true);
        emailAdminInactif = creerCompte("admin-inactif", UserRole.ADMIN_RH, null, false);
        emailRespoA = creerCompte("respo-a", UserRole.RESPONSABLE, respoA, true);
        emailRespoB = creerCompte("respo-b", UserRole.RESPONSABLE, respoB, true);

        salarieId = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Sara").lastName("Alaoui").email("sara-" + UUID.randomUUID() + "@example.com")
                .poste("Comptable").dateEmbauche(LocalDate.now().minusDays(10))
                .directionId(direction.getId()).responsableId(respoA.getId()).build()).getId();
        periode = periodeRepository.findBySalarieId(salarieId).get(0);
    }

    private Responsable creerResponsable(String suffixe, Direction direction) {
        return responsableRepository.save(Responsable.builder().firstName("Resp").lastName(suffixe)
                .email("resp-" + suffixe + "-" + UUID.randomUUID() + "@example.com")
                .poste("Manager").direction(direction).build());
    }

    private String creerCompte(String prefixe, UserRole role, Responsable responsable, boolean actif) {
        String email = prefixe + "-" + UUID.randomUUID() + "@example.com";
        userRepository.save(User.builder().nom("Test").prenom(prefixe).email(email)
                .password(passwordEncoder.encode("Secret1234")).role(role).responsable(responsable).enabled(actif).build());
        return email;
    }

    private String jeton(String email) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(email).password("Secret1234").build())))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        return "Bearer " + json.get("token").asText();
    }

    private void remplirLEvaluation() {
        evaluationService.soumettreEvaluation(periode.getId(), EvaluationDetailRequestDTO.builder()
                .noteCompetencesPro(4.0).noteAptitudesPerso(4.5).noteQSE(5.0)
                .recommandationEvaluateur(RecommandationEvaluateur.CONFIRMATION_CDI)
                .jsonReponsesCriteres("{}").build());
    }

    private List<HistoriqueEmail> emails() {
        return historiqueRepository.findBySalarieId(salarieId);
    }

    @Test
    void tousLesAdminsActifsRecoiventUnEmailQuandLeFormulaireEstRempli() {
        remplirLEvaluation();

        List<HistoriqueEmail> aDesAdmins = emails().stream()
                .filter(e -> e.getRoleDestinataire() == RoleDestinataire.ADMIN).toList();
        assertEquals(2, aDesAdmins.size(), "un e-mail par administrateur actif");
        assertTrue(aDesAdmins.stream().anyMatch(e -> e.getDestinataire().equals(emailAdminA)));
        assertTrue(aDesAdmins.stream().anyMatch(e -> e.getDestinataire().equals(emailAdminB)));
        assertTrue(aDesAdmins.stream().noneMatch(e -> e.getDestinataire().equals(emailAdminInactif)), "pas l'admin désactivé");

        HistoriqueEmail mail = aDesAdmins.get(0);
        assertEquals(TypeEmail.CONFIRMATION_RH, mail.getTypeEmail());
        assertTrue(mail.getObjet().startsWith("Évaluation reçue : Sara Alaoui"), mail.getObjet());
        assertTrue(mail.getContenuCorps().contains("Resp a vient de remplir l’évaluation"), mail.getContenuCorps());
        assertTrue(mail.getContenuCorps().contains("Note globale : 4,50 / 5"), mail.getContenuCorps());
        assertTrue(mail.getContenuCorps().contains("Confirmation (titularisation)"), mail.getContenuCorps());
        assertTrue(mail.getContenuCorps().contains("Bonjour "), mail.getContenuCorps());
        assertTrue(!mail.getContenuCorps().matches("(?s).*\\{[a-z_]+}.*"), "variable non remplacée");

        // Le responsable concerné reçoit sa propre confirmation (et personne d'autre parmi les responsables)
        List<HistoriqueEmail> auResponsable = emails().stream()
                .filter(e -> e.getRoleDestinataire() == RoleDestinataire.RESPONSABLE).toList();
        assertEquals(1, auResponsable.size());
        assertTrue(auResponsable.get(0).getObjet().startsWith("Confirmation de soumission"));
    }

    @Test
    void notificationsDansLEspaceDesAdminsEtDuResponsableConcerne() throws Exception {
        remplirLEvaluation();

        // Tous les admins partagent les notifications RH
        for (String admin : new String[]{emailAdminA, emailAdminB}) {
            mockMvc.perform(get("/api/notifications").header("Authorization", jeton(admin)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.titre =~ /Evaluation completee.*/)]").isNotEmpty())
                    .andExpect(jsonPath("$[?(@.titre =~ /Évaluation enregistrée.*/)]").isEmpty());
        }
        // Le responsable concerné voit la sienne, pas celles des RH
        mockMvc.perform(get("/api/notifications").header("Authorization", jeton(emailRespoA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].titre").value("Évaluation enregistrée : Sara Alaoui"));
        // Un autre responsable ne voit rien
        mockMvc.perform(get("/api/notifications").header("Authorization", jeton(emailRespoB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void unResponsableNePeutMarquerQueSesNotifications() throws Exception {
        remplirLEvaluation();
        String tokenA = jeton(emailRespoA);
        String tokenB = jeton(emailRespoB);
        long id = objectMapper.readTree(mockMvc.perform(get("/api/notifications").header("Authorization", tokenA))
                .andReturn().getResponse().getContentAsString()).get(0).get("id").asLong();

        mockMvc.perform(patch("/api/notifications/" + id + "/read").header("Authorization", tokenB))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/notifications/" + id + "/read").header("Authorization", tokenA))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/notifications").header("Authorization", tokenA))
                .andExpect(jsonPath("$[0].estLue").value(true));
        mockMvc.perform(patch("/api/notifications/read-all").header("Authorization", tokenB))
                .andExpect(status().isNoContent());
    }

    @Test
    void leRetardPrevientLeResponsableConcerneEtLesAdmins() throws Exception {
        PeriodeEvaluation p = periodeRepository.findById(periode.getId()).orElseThrow();
        p.setDateEcheance(LocalDate.now().minusDays(2));
        periodeRepository.save(p);

        cron.detecterRetards(LocalDate.now(), true);

        mockMvc.perform(get("/api/notifications").header("Authorization", jeton(emailRespoA)))
                .andExpect(jsonPath("$[?(@.titre =~ /Retard : évaluation de Sara Alaoui/)]").isNotEmpty());
        mockMvc.perform(get("/api/notifications").header("Authorization", jeton(emailRespoB)))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/notifications").header("Authorization", jeton(emailAdminA)))
                .andExpect(jsonPath("$[?(@.titre =~ /DÉCISION RH requise : Dossier.*/)]").isNotEmpty());
    }

    @Test
    void uneRuptureDecideeParLaRhPrevientLeResponsableEtTousLesAdmins() {
        evaluationService.priseDeDecisionDirecteRH(periode.getId(),
                com.premium.essai.dto.DecisionRHRequestDTO.builder()
                        .decisionFinale(com.premium.essai.model.enums.DecisionFinal.RUPTURE)
                        .commentaireRH("Période d'essai non concluante").build());

        List<HistoriqueEmail> decisions = emails().stream()
                .filter(e -> e.getObjet().startsWith("Décision RH : arrêt du contrat")).toList();

        assertEquals(3, decisions.size(), "un e-mail pour le responsable et un par administrateur actif");
        assertTrue(decisions.stream().anyMatch(e -> e.getRoleDestinataire() == RoleDestinataire.RESPONSABLE));
        assertTrue(decisions.stream().anyMatch(e -> e.getDestinataire().equals(emailAdminA)));
        assertTrue(decisions.stream().anyMatch(e -> e.getDestinataire().equals(emailAdminB)));
        assertTrue(decisions.stream().noneMatch(e -> e.getDestinataire().equals(emailAdminInactif)), "pas l'admin désactivé");
        assertTrue(decisions.get(0).getContenuCorps().contains("Période d'essai non concluante"), decisions.get(0).getContenuCorps());
    }
}
