package com.premium.essai.config;

import com.premium.essai.model.ParametresCompte;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.TemplateEmail;
import com.premium.essai.model.enums.StatutEssai;
import com.premium.essai.repository.ParametresCompteRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.SalarieRepository;
import com.premium.essai.repository.TemplateEmailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Objects;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final TemplateEmailRepository templateEmailRepository;
    private final ParametresCompteRepository parametresCompteRepository;
    private final SalarieRepository salarieRepository;
    private final PeriodeEvaluationRepository periodeRepository;

    @Value("${application.mail-sender:}")
    private String expediteurParDefaut;

    @Override
    public void run(String... args) {
        initParametresCompte();
        ModelesEmail.PAR_DEFAUT.forEach(this::initModeleEmail);
        initDatesFinDecision();
    }


    private void initDatesFinDecision() {
        salarieRepository.findAll().stream()
                .filter(s -> s.getStatutEssai() == StatutEssai.VALIDE
                        || s.getStatutEssai() == StatutEssai.Titulaire
                        || s.getStatutEssai() == StatutEssai.RUPTURE)
                .forEach(s -> periodeRepository.findBySalarieId(s.getId()).stream()
                        .map(PeriodeEvaluation::getDateValidationEvaluateur)
                        .filter(Objects::nonNull)
                        .max(LocalDate::compareTo)
                        .filter(dateDecision -> !dateDecision.equals(s.getDateFinPrevisionnelle()))
                        .ifPresent(dateDecision -> {
                            s.setDateFinPrevisionnelle(dateDecision);
                            salarieRepository.save(s);
                            log.info("Date de fin du salarié {} alignée sur la décision du {}", s.getMatricule(), dateDecision);
                        }));
    }

    private void initParametresCompte() {
        if (parametresCompteRepository.findFirstByOrderByIdAsc().isPresent()) {
            return;
        }
        if (expediteurParDefaut.isBlank()) {
            log.warn("Aucun expéditeur d'e-mails configuré : définissez MAIL_SENDER (ou MAIL_USERNAME), ou renseignez-le dans Paramètres.");
            return;
        }
        parametresCompteRepository.save(ParametresCompte.builder()
                .nomExpediteur("Direction RH - Groupe Premium")
                .emailExpediteur(expediteurParDefaut)
                .build());
        log.info("Paramètres de compte initialisés (expéditeur : {})", expediteurParDefaut);
    }

    // Crée le modèle s'il n'existe pas. S'il existe et qu'il est encore identique à l'ancien texte par défaut,
    // il est mis à jour ; un modèle modifié par un administrateur n'est jamais écrasé.
    private void initModeleEmail(ModelesEmail.Modele modele) {
        var existant = templateEmailRepository.findByTypeEmail(modele.type());
        if (existant.isEmpty()) {
            templateEmailRepository.save(TemplateEmail.builder()
                    .id(modele.id())
                    .nom(modele.nom())
                    .delai(modele.delai())
                    .typeEmail(modele.type())
                    .objet(modele.objet())
                    .contenu(modele.contenu())
                    .build());
            log.info("Modèle d'e-mail '{}' créé.", modele.nom());
            return;
        }

        TemplateEmail courant = existant.get();
        if (modele.ancienContenu() != null && normaliser(modele.ancienContenu()).equals(normaliser(courant.getContenu()))) {
            courant.setObjet(modele.objet());
            courant.setContenu(modele.contenu());
            templateEmailRepository.save(courant);
            log.info("Modèle d'e-mail '{}' mis à jour vers la nouvelle version par défaut.", modele.nom());
        }
    }

    private static String normaliser(String texte) {
        return texte == null ? "" : texte.replace("\r\n", "\n").strip();
    }
}
