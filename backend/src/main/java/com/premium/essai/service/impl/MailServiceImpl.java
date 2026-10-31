package com.premium.essai.service.impl;

import com.premium.essai.model.HistoriqueEmail;
import com.premium.essai.model.ParametresCompte;
import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.TemplateEmail;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.RecommandationEvaluateur;
import com.premium.essai.model.enums.RoleDestinataire;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.model.enums.StatutEmail;
import com.premium.essai.model.enums.TypeEmail;
import com.premium.essai.repository.HistoriqueEmailRepository;
import com.premium.essai.repository.ParametresCompteRepository;
import com.premium.essai.repository.TemplateEmailRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MailServiceImpl implements MailService {

    private final JavaMailSender mailSender;
    private final TemplateEmailRepository templateEmailRepository;
    private final HistoriqueEmailRepository historiqueEmailRepository;
    private final ParametresCompteRepository parametresCompteRepository;
    private final UserRepository userRepository;

    @Value("${application.frontend-url}")
    private String frontendUrl;

    @Value("${application.mail-sender:}")
    private String expediteurParDefaut;

    @Override
    @Transactional
    public boolean sendRappelJ21(PeriodeEvaluation periode) {
        return sendEmailAvecTemplate(periode, TypeEmail.EMAIL_1_PREMIER_RAPPEL);
    }

    @Override
    @Transactional
    public boolean sendRappelJ14(PeriodeEvaluation periode) {
        return sendEmailAvecTemplate(periode, TypeEmail.EMAIL_2_SECOND_RAPPEL);
    }

    @Override
    @Transactional
    public boolean sendRappelJ7(PeriodeEvaluation periode) {
        ParametresCompte params = parametresCompteRepository.findFirstByOrderByIdAsc().orElse(null);
        String rhEmail = (params != null && params.getEmailExpediteur() != null) ? params.getEmailExpediteur() : expediteurParDefaut;
        return sendEmailAvecTemplateEtCC(periode, TypeEmail.EMAIL_3_DERNIER_RAPPEL, rhEmail);
    }

    @Override
    @Transactional
    public boolean sendAlerteRetard(PeriodeEvaluation periode, int joursRetard) {
        String destinataire = periode.getResponsable().getEmail();
        String nomSalarie = periode.getSalarie().getFirstName() + " " + periode.getSalarie().getLastName();
        ParametresCompte params = parametresCompteRepository.findFirstByOrderByIdAsc().orElse(null);
        String rhEmail = (params != null && params.getEmailExpediteur() != null) ? params.getEmailExpediteur() : expediteurParDefaut;

        // Texte modifiable en base (modèle « retard critique ») ; à défaut, texte historique ci-dessous
        TemplateEmail modeleRetard = templateEmailRepository.findByTypeEmail(TypeEmail.EMAIL_3_EN_RETARD).orElse(null);
        if (modeleRetard != null) {
            String objetModele = remplirModele(modeleRetard.getObjet(), periode, joursRetard);
            String corpsModele = remplirModele(modeleRetard.getContenu(), periode, joursRetard);
            boolean envoye = dispatchEmail(destinataire, rhEmail, objetModele, corpsModele);
            logHistorique(periode, destinataire, periode.getResponsable().getLastName(), RoleDestinataire.RESPONSABLE,
                    objetModele, TypeEmail.EMAIL_3_EN_RETARD, corpsModele, lienEvaluation(periode), envoye);
            return envoye;
        }

        String objet = "URGENT : [RETARD CRITIQUE +" + joursRetard + "j] Évaluation de la période d'essai - " + nomSalarie;
        String corps = String.format(
                "Bonjour %s,\n\n" +
                "L'évaluation de la période d'essai de %s (matricule : %s) a dépassé sa date limite depuis %d jour(s) (échéance était le %s).\n\n" +
                "En application des règles contractuelles, le dossier a été bloqué et placé sous le statut 'EN ATTENTE DÉCISION RH'.\n" +
                "Une décision de régularisation ou de clôture doit être prise par la Direction RH.\n\n" +
                "Cordialement,\n" +
                "Direction RH - Groupe Premium",
                periode.getResponsable().getLastName(), nomSalarie, periode.getSalarie().getMatricule(), joursRetard, periode.getDateEcheance()
        );

        boolean succes = dispatchEmail(destinataire, rhEmail, objet, corps);
        logHistorique(periode, destinataire, periode.getResponsable().getLastName(), RoleDestinataire.RESPONSABLE, objet, TypeEmail.EMAIL_3_EN_RETARD, corps, null, succes);
        return succes;
    }

    // Envoyé à TOUS les administrateurs actifs dès qu'un responsable remplit l'évaluation
    @Override
    @Transactional
    public void sendNotificationFormulaireRempliAuxAdmins(PeriodeEvaluation periode, RecommandationEvaluateur recommandation) {
        List<User> admins = userRepository.findByRole(UserRole.ADMIN_RH).stream().filter(User::isEnabled).toList();
        if (admins.isEmpty()) {
            log.warn("Aucun administrateur actif à prévenir pour l'évaluation de la période {}.", periode.getId());
            return;
        }
        TemplateEmail modele = templateEmailRepository.findByTypeEmail(TypeEmail.CONFIRMATION_RH).orElse(null);
        String nomSalarie = periode.getSalarie().getFirstName() + " " + periode.getSalarie().getLastName();
        String nomManager = periode.getResponsable().getFirstName() + " " + periode.getResponsable().getLastName();
        String note = periode.getNoteGlobale() != null ? String.format(Locale.FRANCE, "%.2f / 5", periode.getNoteGlobale()) : "—";
        String reco = libelleRecommandation(recommandation);
        String dateSoumission = LocalDate.now().format(DATE_FR);

        for (User admin : admins) {
            String nomAdmin = ((admin.getPrenom() != null ? admin.getPrenom() : "") + " "
                    + (admin.getNom() != null ? admin.getNom() : "")).trim();
            if (nomAdmin.isEmpty()) nomAdmin = "Administrateur";
            Map<String, String> champs = Map.of(
                    "nom_admin", nomAdmin,
                    "matricule", periode.getSalarie().getMatricule(),
                    "note_globale", note,
                    "recommandation", reco,
                    "date_soumission", dateSoumission);

            String objet;
            String corps;
            if (modele != null) {
                objet = remplirModele(modele.getObjet(), periode, null, champs);
                corps = remplirModele(modele.getContenu(), periode, null, champs);
            } else {
                objet = "Évaluation reçue : " + nomSalarie + " (" + periode.getSalarie().getMatricule() + ")";
                corps = "Bonjour " + nomAdmin + ",\n\n" + nomManager + " vient de remplir l'évaluation de la période d'essai de "
                        + nomSalarie + ".\n\nNote globale : " + note + "\nRecommandation : " + reco
                        + "\nDate de soumission : " + dateSoumission + "\n\nConsultez le détail : " + frontendUrl + "/connexion\n\n"
                        + "Service des Ressources Humaines";
            }
            boolean succes = dispatchEmail(admin.getEmail(), objet, corps);
            logHistorique(periode, admin.getEmail(), nomAdmin, RoleDestinataire.ADMIN, objet, TypeEmail.CONFIRMATION_RH,
                    corps, frontendUrl + "/connexion", succes);
        }
    }

    // Confirmation envoyée au responsable qui vient de remplir l'évaluation
    @Override
    @Transactional
    public void sendConfirmationSoumissionAuResponsable(PeriodeEvaluation periode) {
        String nomSalarie = periode.getSalarie().getFirstName() + " " + periode.getSalarie().getLastName();
        String nomManager = periode.getResponsable().getFirstName() + " " + periode.getResponsable().getLastName();
        String emailManager = periode.getResponsable().getEmail();

        String objet = "Confirmation de soumission : Évaluation période d'essai - " + nomSalarie;
        String corps = String.format(Locale.FRANCE,
                "Bonjour %s,\n\n" +
                "Nous vous confirmons la bonne réception de l'évaluation de la période d'essai pour %s (matricule : %s).\n\n" +
                "Note globale : %.2f / 5\n" +
                "Date de soumission : %s\n\n" +
                "Le dossier a été transmis à la Direction RH pour suivi et validation finale.\n\n" +
                "Cordialement,\n" +
                "Service des Ressources Humaines",
                nomManager, nomSalarie, periode.getSalarie().getMatricule(),
                periode.getNoteGlobale() != null ? periode.getNoteGlobale() : 0.0,
                LocalDate.now().format(DATE_FR)
        );

        boolean succes = dispatchEmail(emailManager, objet, corps);
        logHistorique(periode, emailManager, nomManager, RoleDestinataire.RESPONSABLE, objet, TypeEmail.CONFIRMATION_RH, corps, null, succes);
    }

    private static String libelleRecommandation(RecommandationEvaluateur recommandation) {
        if (recommandation == null) return "—";
        return switch (recommandation) {
            case CONFIRMATION_CDI -> "Confirmation (titularisation)";
            case PROLONGATION_ESSAI -> "Prolongation / renouvellement de la période d'essai";
            case RUPTURE_CONTRAT -> "Arrêt du contrat";
        };
    }

    @Override
    @Transactional
    public void sendConfirmationRH(PeriodeEvaluation periode, String decision) {
        log.info("Notification de décision RH ({}) enregistrée pour le salarié ID : {}", decision, periode.getSalarie().getId());
    }

    private boolean sendEmailAvecTemplate(PeriodeEvaluation periode, TypeEmail typeEmail) {
        return sendEmailAvecTemplateEtCC(periode, typeEmail, null);
    }

    private boolean sendEmailAvecTemplateEtCC(PeriodeEvaluation periode, TypeEmail typeEmail, String ccEmail) {
        TemplateEmail template = templateEmailRepository.findByTypeEmail(typeEmail)
                .orElseThrow(() -> new RuntimeException("Template non trouvé pour : " + typeEmail));

        String destinataire = periode.getResponsable().getEmail();
        String nomResponsable = periode.getResponsable().getFirstName() + " " + periode.getResponsable().getLastName();
        String lienSecurise = lienEvaluation(periode);

        String objet = remplirModele(template.getObjet(), periode, null);
        String corps = remplirModele(template.getContenu(), periode, null);

        boolean succes = dispatchEmail(destinataire, ccEmail, objet, corps);
        logHistorique(periode, destinataire, nomResponsable, RoleDestinataire.RESPONSABLE, objet, typeEmail, corps, lienSecurise, succes);
        return succes;
    }

    private String lienEvaluation(PeriodeEvaluation periode) {
        return frontendUrl + "/evaluation/" + periode.getTokenAccesSalarie();
    }

    private static final DateTimeFormatter DATE_FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // Champs disponibles dans les modèles d'e-mail (les anciens noms restent acceptés)
    private String remplirModele(String modele, PeriodeEvaluation periode, Integer joursRetard) {
        return remplirModele(modele, periode, joursRetard, Map.of());
    }

    // « champs » : valeurs propres à un modèle (ex. nom_admin, note_globale), remplacées en plus des champs communs
    private String remplirModele(String modele, PeriodeEvaluation periode, Integer joursRetard, Map<String, String> champs) {
        String nomSalarie = periode.getSalarie().getFirstName() + " " + periode.getSalarie().getLastName();
        String nomResponsable = periode.getResponsable().getFirstName() + " " + periode.getResponsable().getLastName();
        String echeance = periode.getDateEcheance() != null ? periode.getDateEcheance().format(DATE_FR) : "";
        String lienSecurise = lienEvaluation(periode);
        // Le mot de passe n'est jamais renvoyé par e-mail : il n'est connu que de son titulaire (seule son empreinte est stockée)
        String motDePasse = "celui que vous avez choisi à votre première connexion "
                + "(en cas d'oubli : « Mot de passe oublié » sur la page de connexion)";

        String texte = modele
                .replace("{responsable}", nomResponsable)
                .replace("{nom_manager}", nomResponsable)
                .replace("{salarie}", nomSalarie)
                .replace("{nom_salarie}", nomSalarie)
                .replace("{echeance}", echeance)
                .replace("{date_echeance}", echeance)
                // L'application verrouille l'évaluation à l'échéance : c'est la vraie date limite
                .replace("{date_limite}", echeance)
                .replace("{lien}", lienSecurise)
                .replace("{lien_evaluation}", lienSecurise)
                .replace("{lien_application}", frontendUrl + "/connexion")
                .replace("{identifiant}", periode.getResponsable().getEmail())
                .replace("{mot_de_passe_temporaire}", motDePasse)
                .replace("{jours_retard}", joursRetard != null ? String.valueOf(joursRetard) : "");
        for (Map.Entry<String, String> champ : champs.entrySet()) {
            texte = texte.replace("{" + champ.getKey() + "}", champ.getValue());
        }
        return texte;
    }

    @Override
    public boolean sendInvitationResponsable(User user, String motDePasseTemporaire) {
        String corps = "Bonjour " + user.getPrenom() + " " + user.getNom() + ",\n\n" +
                "La Direction des Ressources Humaines vous a créé un compte responsable sur la plateforme de suivi des périodes d'essai.\n\n" +
                "Identifiant : " + user.getEmail() + "\n" +
                "Mot de passe temporaire : " + motDePasseTemporaire + "\n\n" +
                "Connectez-vous ici : " + frontendUrl + "/connexion\n" +
                "Lors de votre première connexion, vous devrez choisir un nouveau mot de passe.\n\n" +
                "Cordialement,\n" +
                "La Direction des Ressources Humaines";
        return dispatchEmail(user.getEmail(), "[Groupe Premium] Votre accès à la plateforme d'évaluation", corps);
    }

    @Override
    public boolean sendReinitialisationMotDePasse(User user, String jeton) {
        String corps = "Bonjour " + user.getPrenom() + " " + user.getNom() + ",\n\n" +
                "Une réinitialisation de votre mot de passe a été demandée.\n\n" +
                "Choisissez un nouveau mot de passe ici (lien valable 1 heure, utilisable une seule fois) :\n" +
                frontendUrl + "/reinitialiser-mot-de-passe?token=" + jeton + "\n\n" +
                "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.\n\n" +
                "Cordialement,\n" +
                "La Direction des Ressources Humaines";
        return dispatchEmail(user.getEmail(), "[Groupe Premium] Réinitialisation de votre mot de passe", corps);
    }

    @Override
    public boolean sendInvitationAdmin(User user, String jeton) {
        String corps = "Bonjour " + user.getPrenom() + " " + user.getNom() + ",\n\n" +
                "Un compte administrateur RH vous a été créé sur la plateforme de suivi des périodes d'essai.\n\n" +
                "Identifiant : " + user.getEmail() + "\n\n" +
                "Activez votre compte et choisissez votre mot de passe ici (lien valable 48 heures, utilisable une seule fois) :\n" +
                frontendUrl + "/reinitialiser-mot-de-passe?token=" + jeton + "&invitation=1\n\n" +
                "Si vous n'attendiez pas cette invitation, ignorez ce message.\n\n" +
                "Cordialement,\n" +
                "La Direction des Ressources Humaines";
        return dispatchEmail(user.getEmail(), "[Groupe Premium] Invitation administrateur RH", corps);
    }

    private boolean dispatchEmail(String to, String subject, String body) {
        return dispatchEmail(to, null, subject, body);
    }

    private boolean dispatchEmail(String to, String cc, String subject, String body) {
        try {
            ParametresCompte params = parametresCompteRepository.findFirstByOrderByIdAsc().orElse(null);
            String fromEmail = (params != null && params.getEmailExpediteur() != null) ? params.getEmailExpediteur() : expediteurParDefaut;

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            if (cc != null && !cc.isBlank() && !cc.equalsIgnoreCase(to)) {
                helper.setCc(cc);
            }
            helper.setSubject(subject);
            helper.setText(body, false);

            mailSender.send(message);
            log.info("E-mail envoyé avec succès à : {} (CC: {})", to, cc);
            return true;
        } catch (Exception e) {
            log.error("Erreur d'envoi d'e-mail à {} : {}", to, e.getMessage());
            return false;
        }
    }

    private void logHistorique(PeriodeEvaluation periode, String dest, String destNom, RoleDestinataire role, String objet, TypeEmail type, String corps, String lien, boolean succes) {
        HistoriqueEmail histo = HistoriqueEmail.builder()
                .salarie(periode.getSalarie())
                .salarieNom(periode.getSalarie().getFirstName() + " " + periode.getSalarie().getLastName())
                .destinataire(dest)
                .destinataireNom(destNom)
                .roleDestinataire(role)
                .objet(objet)
                .typeEmail(type)
                .dateEnvoi(LocalDate.now())
                .heureEnvoi(LocalTime.now())
                .statut(succes ? StatutEmail.DELIVRE.name() : StatutEmail.ECHEC.name())
                .batchCron(true)
                .contenuCorps(corps)
                .lienSecurise(lien)
                .build();

        historiqueEmailRepository.save(histo);
    }
}