package com.premium.essai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.premium.essai.dto.DecisionRHRequestDTO;
import com.premium.essai.dto.EvaluationDetailRequestDTO;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.dto.SalarieResponseDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.Salarie;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.DecisionFinal;
import com.premium.essai.model.enums.DecisionPeriode;
import com.premium.essai.model.enums.PeriodeType;
import com.premium.essai.model.enums.RecommandationEvaluateur;
import com.premium.essai.model.enums.StatutEssai;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.EvaluationService;
import com.premium.essai.service.MailService;
import com.premium.essai.service.NotificationEcheanceService;
import com.premium.essai.service.SalarieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Cron des rappels, évaluation, décision RH, archivage, restauration et lien d'évaluation
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FluxCompletTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private SalarieRepository salarieRepository;
    @Autowired private PeriodeEvaluationRepository periodeRepository;
    @Autowired private SalarieService salarieService;
    @Autowired private EvaluationService evaluationService;
    @Autowired private NotificationEcheanceService cron;

    @MockBean private MailService mailService;

    private Direction direction;
    private Responsable responsable;
    private SalarieResponseDTO salarie;
    private PeriodeEvaluation p1;

    @BeforeEach
    void init() {
        direction = directionRepository.save(Direction.builder().code("DIR-F").name("Direction Flux").build());
        responsable = creerResponsable("a");
        salarie = creerSalarie(responsable);
        p1 = periodeRepository.findBySalarieId(salarie.getId()).get(0);
        when(mailService.sendRappelJ21(any())).thenReturn(true);
        when(mailService.sendRappelJ14(any())).thenReturn(true);
        when(mailService.sendRappelJ7(any())).thenReturn(true);
    }

    private Responsable creerResponsable(String suffixe) {
        return responsableRepository.save(Responsable.builder()
                .firstName("Resp").lastName(suffixe)
                .email("resp-" + suffixe + "-" + UUID.randomUUID() + "@example.com")
                .poste("Manager").direction(direction).build());
    }

    // Embauché il y a 10 jours : la période de 3 mois est encore ouverte
    private SalarieResponseDTO creerSalarie(Responsable resp) {
        return salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Sal").lastName("Flux")
                .email("sal-" + UUID.randomUUID() + "@example.com")
                .poste("Dev").dateEmbauche(LocalDate.now().minusDays(10))
                .directionId(direction.getId()).responsableId(resp.getId()).build());
    }

    private PeriodeEvaluation recharger(PeriodeEvaluation p) {
        return periodeRepository.findById(p.getId()).orElseThrow();
    }

    private EvaluationDetailRequestDTO evaluation(RecommandationEvaluateur recommandation) {
        return EvaluationDetailRequestDTO.builder()
                .noteCompetencesPro(4.0).noteAptitudesPerso(4.0).noteQSE(4.0)
                .recommandationEvaluateur(recommandation)
                .jsonReponsesCriteres("{}").build();
    }

    private PeriodeEvaluation periodeSixMois() {
        return periodeRepository.findBySalarieId(salarie.getId()).stream()
                .filter(p -> p.getTypePeriode() == PeriodeType.SIX_MOIS).findFirst().orElseThrow();
    }

    // ---------- Cron des rappels ----------

    @Test
    void rappelsPartentParTrancheEtUneSeuleFois() {
        LocalDate echeance = p1.getDateEcheance();

        // J-19 (et non J-21 exact, par ex. un week-end manqué) : le rappel initial part quand même
        cron.traiterEcheances(echeance.minusDays(19), true);
        verify(mailService, times(1)).sendRappelJ21(any());
        assertEquals(StatutPeriode.EN_COURS, recharger(p1).getStatut());

        // Un deuxième passage le même jour n'envoie rien de plus
        cron.traiterEcheances(echeance.minusDays(18), true);
        verify(mailService, times(1)).sendRappelJ21(any());

        cron.traiterEcheances(echeance.minusDays(10), true);
        verify(mailService, times(1)).sendRappelJ14(any());
        assertEquals(StatutPeriode.EN_RELANCE, recharger(p1).getStatut());

        cron.traiterEcheances(echeance.minusDays(3), true);
        verify(mailService, times(1)).sendRappelJ7(any());
        assertEquals(StatutPeriode.EN_RETARD_CRITIQUE, recharger(p1).getStatut());

        cron.traiterEcheances(echeance.minusDays(2), true);
        verify(mailService, times(1)).sendRappelJ7(any());
    }

    @Test
    void envoiEchoueEstRetenteAuPassageSuivant() {
        LocalDate echeance = p1.getDateEcheance();
        when(mailService.sendRappelJ21(any())).thenReturn(false);

        cron.traiterEcheances(echeance.minusDays(21), true);
        assertEquals(StatutPeriode.PLANIFIEE, recharger(p1).getStatut());
        assertNull(recharger(p1).getDateDernierRappel());

        when(mailService.sendRappelJ21(any())).thenReturn(true);
        cron.traiterEcheances(echeance.minusDays(20), true);
        assertEquals(StatutPeriode.EN_COURS, recharger(p1).getStatut());
        verify(mailService, times(2)).sendRappelJ21(any());
    }

    @Test
    void salarieClotureNeRecoitPlusDeRappel() {
        Salarie s = salarieRepository.findById(salarie.getId()).orElseThrow();
        s.setActif(false);
        s.setBloqueEmails(true);
        salarieRepository.save(s);

        cron.traiterEcheances(p1.getDateEcheance().minusDays(20), true);
        cron.traiterEcheances(p1.getDateEcheance().minusDays(10), true);
        cron.traiterEcheances(p1.getDateEcheance().minusDays(3), true);

        verify(mailService, never()).sendRappelJ21(any());
        verify(mailService, never()).sendRappelJ14(any());
        verify(mailService, never()).sendRappelJ7(any());
    }

    @Test
    void echeanceDepasseeBloqueLeDossierEtStoppeLesEmails() {
        cron.traiterEcheances(p1.getDateEcheance().plusDays(2), true);

        PeriodeEvaluation p = recharger(p1);
        assertEquals(StatutPeriode.EN_ATTENTE_DECISION_RH, p.getStatut());
        assertTrue(salarieRepository.findById(salarie.getId()).orElseThrow().isBloqueEmails());
        verify(mailService, times(1)).sendAlerteRetard(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    // ---------- Détection immédiate du retard ----------

    @Test
    void unSalarieEmbaucheIlYALongtempsEstImmediatementEnRetardSansEmail() {
        // Historique : embauché il y a 8 mois, la période de 3 mois est échue depuis ~5 mois
        SalarieResponseDTO ancien = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Ancien").lastName("Salarie").email("ancien-" + UUID.randomUUID() + "@example.com")
                .poste("Dev").dateEmbauche(LocalDate.now().minusMonths(8))
                .directionId(direction.getId()).responsableId(responsable.getId()).build());

        PeriodeEvaluation periode = periodeRepository.findBySalarieId(ancien.getId()).get(0);
        assertEquals(StatutPeriode.EN_ATTENTE_DECISION_RH, periode.getStatut());
        assertTrue(periode.getJoursRetard() > 100, "jours de retard : " + periode.getJoursRetard());
        assertTrue(salarieRepository.findById(ancien.getId()).orElseThrow().isBloqueEmails());
        // Constat silencieux : aucun e-mail d'alerte envoyé au responsable pour un import d'historique
        verify(mailService, never()).sendAlerteRetard(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void laDetectionPeriodiqueSignaleLeRetardEtEnvoieUneSeuleAlerte() {
        PeriodeEvaluation p = recharger(p1);
        p.setDateEcheance(LocalDate.now().minusDays(1));
        periodeRepository.save(p);

        // Même un dimanche ou un jour férié : le retard est constaté (pas de dépendance aux jours ouvrables)
        int nouveaux = cron.detecterRetards(LocalDate.now(), true);

        assertEquals(1, nouveaux);
        PeriodeEvaluation constate = recharger(p1);
        assertEquals(StatutPeriode.EN_ATTENTE_DECISION_RH, constate.getStatut());
        assertEquals(1, constate.getJoursRetard());
        verify(mailService, times(1)).sendAlerteRetard(any(), org.mockito.ArgumentMatchers.anyInt());

        // Un second passage ne renvoie rien et met à jour les jours de retard
        assertEquals(0, cron.detecterRetards(LocalDate.now().plusDays(2), true));
        assertEquals(3, recharger(p1).getJoursRetard());
        verify(mailService, times(1)).sendAlerteRetard(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void laListeDesPeriodesMontreLeRetardSansAttendreLaDetection() throws Exception {
        PeriodeEvaluation p = recharger(p1);
        p.setDateEcheance(LocalDate.now().minusDays(4)); // échue, pas encore constatée en base
        periodeRepository.save(p);
        String admin = jeton(creerCompte("admin", UserRole.ADMIN_RH, null));

        mockMvc.perform(get("/api/periodes").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + p.getId() + ")].statut").value("EN_ATTENTE_DECISION_RH"))
                .andExpect(jsonPath("$[?(@.id == " + p.getId() + ")].joursRetard").value(4));
        mockMvc.perform(get("/api/dashboard/stats").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEvaluationsEnRetardCritique").value(1));
    }

    @Test
    void leStatutAfficheSuitLesJoursRestantsAvantLEcheance() throws Exception {
        String admin = jeton(creerCompte("admin", UserRole.ADMIN_RH, null));
        // jours restants -> statut affiché : En cours (>14), En relance (8-14), En retard (0-7), Décision RH (échéance dépassée)
        Object[][] cas = {{30, "EN_COURS"}, {15, "EN_COURS"}, {14, "EN_RELANCE"}, {8, "EN_RELANCE"},
                {7, "EN_RETARD_CRITIQUE"}, {0, "EN_RETARD_CRITIQUE"}, {-1, "EN_ATTENTE_DECISION_RH"}};
        for (Object[] c : cas) {
            PeriodeEvaluation p = recharger(p1);
            p.setDateEcheance(LocalDate.now().plusDays((Integer) c[0]));
            p.setStatut(StatutPeriode.PLANIFIEE);
            periodeRepository.save(p);

            mockMvc.perform(get("/api/periodes").header("Authorization", admin))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == " + p.getId() + ")].statut").value(c[1]));
        }
    }

    @Test
    void uneEvaluationDejaRenduePasseNEstJamaisEnRetard() {
        evaluationService.soumettreEvaluation(p1.getId(), evaluation(RecommandationEvaluateur.PROLONGATION_ESSAI));
        PeriodeEvaluation p = recharger(p1);
        p.setDateEcheance(LocalDate.now().minusDays(10));
        periodeRepository.save(p);

        assertEquals(0, cron.detecterRetards(LocalDate.now(), true));
        assertEquals(StatutPeriode.COMPLETEE, recharger(p1).getStatut());
    }

    // ---------- Évaluation, décision, archivage, restauration ----------

    @Test
    void cycleEvaluationDecisionArchivageRestauration() throws Exception {
        // 1. Le responsable soumet l'évaluation 3 mois : la période de 6 mois est créée
        evaluationService.soumettreEvaluation(p1.getId(), evaluation(RecommandationEvaluateur.PROLONGATION_ESSAI));
        assertEquals(StatutPeriode.COMPLETEE, recharger(p1).getStatut());
        PeriodeEvaluation p2 = periodeSixMois();
        assertEquals(StatutPeriode.PLANIFIEE, p2.getStatut());

        // 2. La RH décide l'arrêt du contrat : le dossier est archivé (inactif, e-mails bloqués)
        evaluationService.priseDeDecisionDirecteRH(p2.getId(),
                DecisionRHRequestDTO.builder().decisionFinale(DecisionFinal.RUPTURE).commentaireRH("Insuffisant").build());
        Salarie archive = salarieRepository.findById(salarie.getId()).orElseThrow();
        assertFalse(archive.isActif());
        assertTrue(archive.isBloqueEmails());
        assertEquals(StatutEssai.RUPTURE, archive.getStatutEssai());
        assertEquals(DecisionPeriode.RUPTURE, recharger(p2).getDecisionFinale());

        // Une décision déjà prise ne peut pas être rejouée
        assertThrows(IllegalStateException.class, () -> evaluationService.priseDeDecisionDirecteRH(p2.getId(),
                DecisionRHRequestDTO.builder().decisionFinale(DecisionFinal.VALIDATION).build()));

        // 3. L'Admin RH restaure le dossier : actif, e-mails débloqués, dernière période rouverte
        String token = jeton(creerCompte("admin", UserRole.ADMIN_RH, null));
        mockMvc.perform(post("/api/salaries/" + salarie.getId() + "/restauration").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actif").value(true))
                .andExpect(jsonPath("$.statutEssai").value("EN_COURS"));

        Salarie restaure = salarieRepository.findById(salarie.getId()).orElseThrow();
        assertTrue(restaure.isActif());
        assertFalse(restaure.isBloqueEmails());
        PeriodeEvaluation rouverte = recharger(p2);
        assertEquals(StatutPeriode.EN_COURS, rouverte.getStatut());
        assertNull(rouverte.getDecisionFinale());
        assertNull(rouverte.getDateValidationRh());

        // Restaurer un dossier déjà actif est refusé
        mockMvc.perform(post("/api/salaries/" + salarie.getId() + "/restauration").header("Authorization", token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void restaurationReserveeAuxAdmins() throws Exception {
        String token = jeton(creerCompte("respo", UserRole.RESPONSABLE, responsable));
        mockMvc.perform(post("/api/salaries/" + salarie.getId() + "/restauration").header("Authorization", token))
                .andExpect(status().isForbidden());
    }

    @Test
    void evaluationFigeeApresDecisionRH() {
        evaluationService.priseDeDecisionDirecteRH(p1.getId(),
                DecisionRHRequestDTO.builder().decisionFinale(DecisionFinal.RENOUVELLEMENT).build());

        assertThrows(IllegalStateException.class,
                () -> evaluationService.soumettreEvaluation(p1.getId(), evaluation(RecommandationEvaluateur.CONFIRMATION_CDI)));
    }

    // ---------- Lien d'évaluation reçu par e-mail ----------

    @Test
    void lienEvaluationNeSertQuAuResponsableConcerne() throws Exception {
        Responsable autre = creerResponsable("b");
        String tokenAutre = periodeRepository.findBySalarieId(creerSalarie(autre).getId()).get(0).getTokenAccesSalarie();
        String tokenMien = p1.getTokenAccesSalarie();
        String jetonA = jeton(creerCompte("respo-a", UserRole.RESPONSABLE, responsable));

        mockMvc.perform(get("/api/evaluations/lien/" + tokenMien).header("Authorization", jetonA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.periodeId").value(p1.getId()));
        mockMvc.perform(get("/api/evaluations/lien/" + tokenAutre).header("Authorization", jetonA))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/evaluations/access/" + tokenAutre).header("Authorization", jetonA))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/evaluations/lien/" + UUID.randomUUID()).header("Authorization", jetonA))
                .andExpect(status().isNotFound());
        // Sans connexion, le lien ne donne rien
        mockMvc.perform(get("/api/evaluations/lien/" + tokenMien))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void lienEvaluationVerrouilleApresEcheance() throws Exception {
        PeriodeEvaluation p = recharger(p1);
        p.setStatut(StatutPeriode.EN_ATTENTE_DECISION_RH);
        periodeRepository.save(p);
        String jetonA = jeton(creerCompte("respo-a", UserRole.RESPONSABLE, responsable));

        mockMvc.perform(get("/api/evaluations/access/" + p.getTokenAccesSalarie()).header("Authorization", jetonA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.verrouille").value(true));
        assertNotNull(p.getTokenAccesSalarie());
    }

    // ---------- Outils ----------

    private String creerCompte(String prefixe, UserRole role, Responsable resp) {
        String email = prefixe + "-" + UUID.randomUUID() + "@example.com";
        userRepository.save(User.builder().nom("Test").prenom("User").email(email)
                .password(passwordEncoder.encode("Secret1234")).role(role).responsable(resp).build());
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
