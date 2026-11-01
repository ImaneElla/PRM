package com.premium.essai;

import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.dto.SalarieResponseDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.HistoriqueEmail;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.enums.StatutPeriode;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.HistoriqueEmailRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.service.NotificationEcheanceService;
import com.premium.essai.service.NotificationService;
import com.premium.essai.service.SalarieService;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;


@SpringBootTest(properties = "application.mail-sender=rh@example.com")
@ActiveProfiles("test")
@ExtendWith(OutputCaptureExtension.class)
class HistoriqueEmailCronTest {

    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private SalarieRepository salarieRepository;
    @Autowired private PeriodeEvaluationRepository periodeRepository;
    @Autowired private SalarieService salarieService;
    @Autowired private NotificationEcheanceService cron;

    @SpyBean private HistoriqueEmailRepository historiqueRepository;
    @MockBean private JavaMailSender mailSender;
    @MockBean private NotificationService notificationService;

    private Direction direction;
    private Responsable responsable;
    private final List<Long> salariesCrees = new ArrayList<>();

    @BeforeEach
    void init() {
        reset(historiqueRepository);
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> new MimeMessage((Session) null));
        direction = directionRepository.save(Direction.builder().code("DIR-" + UUID.randomUUID().toString().substring(0, 8)).name("Direction Historique").build());
        responsable = responsableRepository.save(Responsable.builder()
                .firstName("Resp").lastName("Histo")
                .email("resp-histo-" + UUID.randomUUID() + "@example.com")
                .poste("Manager").direction(direction).build());
    }

    @AfterEach
    void nettoyer() {
        reset(historiqueRepository);
        for (Long salarieId : salariesCrees) {
            historiqueRepository.deleteAll(historiqueRepository.findBySalarieId(salarieId));
            periodeRepository.deleteAll(periodeRepository.findBySalarieId(salarieId));
            salarieRepository.deleteById(salarieId);
        }
        responsableRepository.deleteById(responsable.getId());
        directionRepository.deleteById(direction.getId());
    }

    private SalarieResponseDTO creerSalarie(LocalDate dateEmbauche) {
        SalarieResponseDTO salarie = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Sal").lastName("Histo")
                .email("sal-histo-" + UUID.randomUUID() + "@example.com")
                .poste("Dev").dateEmbauche(dateEmbauche)
                .directionId(direction.getId()).responsableId(responsable.getId()).build());
        salariesCrees.add(salarie.getId());
        return salarie;
    }

    private PeriodeEvaluation premierePeriode(SalarieResponseDTO salarie) {
        return periodeRepository.findBySalarieId(salarie.getId()).get(0);
    }

    private PeriodeEvaluation enBase(PeriodeEvaluation periode) {
        return periodeRepository.findById(periode.getId()).orElseThrow();
    }

    private void historiqueEnPanne() {
        doThrow(new DataIntegrityViolationException("contrainte de test sur l'historique"))
                .when(historiqueRepository).save(any(HistoriqueEmail.class));
    }

    @Test
    void historiqueEnregistreNormalementApresUnRappel() {
        SalarieResponseDTO salarie = creerSalarie(LocalDate.now().minusMonths(3).plusDays(20));   // J-21 dû
        PeriodeEvaluation periode = premierePeriode(salarie);

        cron.traiterEcheances(LocalDate.now(), true);

        verify(mailSender, times(1)).send(any(MimeMessage.class));
        assertEquals(StatutPeriode.EN_COURS, enBase(periode).getStatut());
        List<HistoriqueEmail> historique = historiqueRepository.findBySalarieId(salarie.getId());
        assertEquals(1, historique.size());
        assertEquals("DELIVRE", historique.get(0).getStatut());
        assertEquals(responsable.getEmail(), historique.get(0).getDestinataire());
    }

    @Test
    void echecDeLHistoriqueApresEnvoiGardeLEtapeEtNeRenvoiePasLEmail(CapturedOutput sortie) {
        SalarieResponseDTO salarie = creerSalarie(LocalDate.now().minusMonths(3).plusDays(20));   // J-21 dû
        PeriodeEvaluation periode = premierePeriode(salarie);
        historiqueEnPanne();

        var rapport = cron.traiterEcheances(LocalDate.now(), true);

        // L'e-mail est parti, le rappel est compté et l'étape est bien validée en base
        assertEquals("SUCCES", rapport.getStatut());
        assertEquals(1, rapport.getRappelsJ21Envoyes());
        verify(mailSender, times(1)).send(any(MimeMessage.class));
        assertEquals(StatutPeriode.EN_COURS, enBase(periode).getStatut());
        assertNotNull(enBase(periode).getDateDernierRappel());
        // L'erreur est journalisée clairement, et aucune ligne d'historique n'a été écrite
        assertTrue(sortie.getOut().contains("Historique e-mail non enregistré"), "erreur d'historique journalisée");
        assertEquals(0, historiqueRepository.findBySalarieId(salarie.getId()).size());

        // Passage suivant : aucun nouvel envoi
        cron.traiterEcheances(LocalDate.now(), true);
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void echecDeLHistoriqueApresAlerteJ7GardeLEtapeEtNeRenvoiePasLEmail() {
        SalarieResponseDTO salarie = creerSalarie(LocalDate.now().minusMonths(3).plusDays(5));    // J-7 dû (copie RH)
        PeriodeEvaluation periode = premierePeriode(salarie);
        historiqueEnPanne();

        cron.traiterEcheances(LocalDate.now(), true);
        cron.traiterEcheances(LocalDate.now(), true);

        verify(mailSender, times(1)).send(any(MimeMessage.class));
        assertEquals(StatutPeriode.EN_RETARD_CRITIQUE, enBase(periode).getStatut());
    }

    @Test
    void echecDeLHistoriqueApresAlerteRetardNeRenvoiePasLEmail() {
        SalarieResponseDTO salarie = creerSalarie(LocalDate.now());   // échéance dans 3 mois
        PeriodeEvaluation periode = premierePeriode(salarie);
        historiqueEnPanne();
        LocalDate dateRetard = periode.getDateEcheance().plusDays(3);   // 3 jours après l'échéance

        int premier = cron.detecterRetards(dateRetard, true);
        int second = cron.detecterRetards(dateRetard, true);

        assertEquals(1, premier);
        assertEquals(0, second);
        verify(mailSender, times(1)).send(any(MimeMessage.class));
        assertEquals(StatutPeriode.EN_ATTENTE_DECISION_RH, enBase(periode).getStatut());
    }
}
