package com.premium.essai;

import com.premium.essai.model.Direction;
import com.premium.essai.model.HistoriqueEmail;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.TemplateEmail;
import com.premium.essai.model.enums.TypeEmail;
import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.HistoriqueEmailRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.TemplateEmailRepository;
import com.premium.essai.service.MailService;
import com.premium.essai.service.SalarieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

// Les trois e-mails RH : contenu généré, champs remplis, aucun mot de passe envoyé
@Import(HistoriqueEmailTestConfig.class)
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ModelesEmailTest {

    @Autowired private MailService mailService;
    @Autowired private TemplateEmailRepository templateRepository;
    @Autowired private HistoriqueEmailRepository historiqueRepository;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private PeriodeEvaluationRepository periodeRepository;
    @Autowired private SalarieService salarieService;

    // L'envoi SMTP échoue immédiatement : le contenu généré est quand même enregistré dans l'historique
    @MockBean private JavaMailSender mailSender;

    private PeriodeEvaluation periode;
    private Long salarieId;
    private String echeanceFr;

    @BeforeEach
    void init() {
        when(mailSender.createMimeMessage()).thenThrow(new MailSendException("SMTP désactivé pour le test"));
        Direction direction = directionRepository.save(Direction.builder().code("DIR-M").name("Direction Mail").build());
        Responsable responsable = responsableRepository.save(Responsable.builder()
                .firstName("Karim").lastName("Bennani").email("karim.bennani@example.com")
                .poste("Manager").direction(direction).build());
        salarieId = salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Sara").lastName("Alaoui").email("sara-" + UUID.randomUUID() + "@example.com")
                .poste("Comptable").dateEmbauche(LocalDate.now().minusDays(10))
                .directionId(direction.getId()).responsableId(responsable.getId()).build()).getId();
        periode = periodeRepository.findBySalarieId(salarieId).get(0);
        echeanceFr = periode.getDateEcheance().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private HistoriqueEmail dernierEmail(TypeEmail type) {
        List<HistoriqueEmail> emails = historiqueRepository.findBySalarieId(salarieId);
        return emails.stream().filter(e -> e.getTypeEmail() == type).reduce((a, b) -> b).orElseThrow();
    }

    private void verifierChampsRemplis(HistoriqueEmail email) {
        String texte = email.getObjet() + "\n" + email.getContenuCorps();
        assertFalse(texte.matches("(?s).*\\{[a-z_]+\\}.*"), "variable non remplacée : " + texte);
        assertTrue(email.getContenuCorps().contains("Bonjour Karim Bennani,"));
        assertTrue(email.getContenuCorps().contains("Sara Alaoui"));
        assertTrue(email.getContenuCorps().contains(echeanceFr), "date d'échéance au format JJ/MM/AAAA");
        assertTrue(email.getContenuCorps().contains("- Identifiant : karim.bennani@example.com"));
        assertTrue(email.getContenuCorps().contains("/evaluation/" + periode.getTokenAccesSalarie()), "lien vers le formulaire");
        assertTrue(email.getContenuCorps().contains("Service des Ressources Humaines"));
        // Aucun mot de passe en clair : on renvoie vers « Mot de passe oublié »
        assertTrue(email.getContenuCorps().contains("Mot de passe oublié"));
        assertFalse(email.getContenuCorps().toLowerCase().contains("temporaire"));
    }

    @Test
    void emailInitialJ21() {
        mailService.sendRappelJ21(periode);

        HistoriqueEmail email = dernierEmail(TypeEmail.EMAIL_1_PREMIER_RAPPEL);
        verifierChampsRemplis(email);
        assertTrue(email.getContenuCorps().contains("La première période d’essai de Sara Alaoui prendra fin le " + echeanceFr));
        assertTrue(email.getContenuCorps().contains("avant le " + echeanceFr), "date limite");
    }

    @Test
    void emailDeRelanceJ14() {
        mailService.sendRappelJ14(periode);

        HistoriqueEmail email = dernierEmail(TypeEmail.EMAIL_2_SECOND_RAPPEL);
        verifierChampsRemplis(email);
        assertTrue(email.getContenuCorps().contains("n’avons pas encore reçu la grille d’évaluation"));
    }

    @Test
    void emailRetardCritique() {
        mailService.sendAlerteRetard(periode, 3);

        HistoriqueEmail email = dernierEmail(TypeEmail.EMAIL_3_EN_RETARD);
        verifierChampsRemplis(email);
        assertTrue(email.getObjet().contains("+3j"), "nombre de jours de retard dans l'objet : " + email.getObjet());
        assertTrue(email.getContenuCorps().contains("retard constaté"));
        assertTrue(email.getContenuCorps().contains("dépassement de l’échéance du " + echeanceFr));
    }

    @Test
    void dernierRappelJ7ContientLesAcces() {
        mailService.sendRappelJ7(periode);

        HistoriqueEmail email = dernierEmail(TypeEmail.EMAIL_3_DERNIER_RAPPEL);
        verifierChampsRemplis(email);
    }

    @Test
    void unModeleModifieParLAdminNEstJamaisEcrase() {
        TemplateEmail modele = templateRepository.findByTypeEmail(TypeEmail.EMAIL_1_PREMIER_RAPPEL).orElseThrow();
        modele.setContenu("Texte personnalisé pour {nom_salarie}");
        templateRepository.save(modele);

        mailService.sendRappelJ21(periode);

        assertEquals("Texte personnalisé pour Sara Alaoui", dernierEmail(TypeEmail.EMAIL_1_PREMIER_RAPPEL).getContenuCorps());
    }
}
