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
import com.premium.essai.repository.ParametresCompteRepository;
import com.premium.essai.repository.TemplateEmailRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.HistoriqueEmailService;
import com.premium.essai.service.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

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
    private final HistoriqueEmailService historiqueEmailService;
    private final ParametresCompteRepository parametresCompteRepository;
    private final UserRepository userRepository;

    @Value("${application.frontend-url}")
    private String frontendUrl;

    // Adresse du serveur sur le réseau local (ex. http://192.168.11.113:3000), ajoutée aux liens des e-mails
    @Value("${application.frontend-url-reseau:}")
    private String frontendUrlReseau;

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
                        + "\nDate de soumission : " + dateSoumission + "\n\nConsultez le détail : " + plusLienReseau(frontendUrl + "/connexion", "/connexion") + "\n\n"
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
        log.info("Décision RH ({}) pour le salarié ID : {} : e-mails au responsable et aux administrateurs", decision, periode.getSalarie().getId());
        String nomSalarie = periode.getSalarie().getFirstName() + " " + periode.getSalarie().getLastName();
        String matricule = periode.getSalarie().getMatricule();
        String motif = periode.getMotifDecision() != null ? periode.getMotifDecision().trim() : "";
        String objet = "Décision RH : " + decision + " — " + nomSalarie;
        String lien = plusLienReseau(frontendUrl + "/connexion", "/connexion");

        // Le responsable concerné
        if (periode.getResponsable() != null && periode.getResponsable().getEmail() != null) {
            String nomResponsable = periode.getResponsable().getFirstName() + " " + periode.getResponsable().getLastName();
            String corps = "Bonjour " + nomResponsable + ",\n\n"
                    + "La Direction des Ressources Humaines a enregistré la décision suivante concernant " + nomSalarie
                    + " (" + matricule + ") : " + decision + ".\n"
                    + (motif.isEmpty() ? "" : "\nMotif : " + motif + "\n")
                    + "\nConsultez le dossier : " + lien + "\n\nService des Ressources Humaines";
            boolean succes = dispatchEmail(periode.getResponsable().getEmail(), objet, corps);
            logHistorique(periode, periode.getResponsable().getEmail(), nomResponsable, RoleDestinataire.RESPONSABLE,
                    objet, TypeEmail.CONFIRMATION_RH, corps, frontendUrl + "/connexion", succes);
        }

        // Tous les administrateurs actifs
        for (User admin : userRepository.findByRole(UserRole.ADMIN_RH).stream().filter(User::isEnabled).toList()) {
            String nomAdmin = ((admin.getPrenom() != null ? admin.getPrenom() : "") + " "
                    + (admin.getNom() != null ? admin.getNom() : "")).trim();
            if (nomAdmin.isEmpty()) nomAdmin = "Administrateur";
            String corps = "Bonjour " + nomAdmin + ",\n\n"
                    + "Une décision RH a été enregistrée concernant " + nomSalarie + " (" + matricule + ") : " + decision + ".\n"
                    + (motif.isEmpty() ? "" : "\nMotif : " + motif + "\n")
                    + "\nConsultez le dossier : " + lien + "\n\nService des Ressources Humaines";
            boolean succes = dispatchEmail(admin.getEmail(), objet, corps);
            logHistorique(periode, admin.getEmail(), nomAdmin, RoleDestinataire.ADMIN,
                    objet, TypeEmail.CONFIRMATION_RH, corps, frontendUrl + "/connexion", succes);
        }
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

    private String plusLienReseau(String lienPrincipal, String chemin) {
        if (frontendUrlReseau == null || frontendUrlReseau.isBlank()) {
            return lienPrincipal;
        }
        return lienPrincipal + "\nDepuis le réseau de l'entreprise : " + frontendUrlReseau.replaceAll("/+$", "") + chemin;
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
                .replace("{lien}", plusLienReseau(lienSecurise, "/evaluation/" + periode.getTokenAccesSalarie()))
                .replace("{lien_evaluation}", plusLienReseau(lienSecurise, "/evaluation/" + periode.getTokenAccesSalarie()))
                .replace("{lien_application}", plusLienReseau(frontendUrl + "/connexion", "/connexion"))
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
                "Connectez-vous ici : " + plusLienReseau(frontendUrl + "/connexion", "/connexion") + "\n" +
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
                plusLienReseau(frontendUrl + "/reinitialiser-mot-de-passe?token=" + jeton, "/reinitialiser-mot-de-passe?token=" + jeton) + "\n\n" +
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
                plusLienReseau(frontendUrl + "/reinitialiser-mot-de-passe?token=" + jeton + "&invitation=1",
                        "/reinitialiser-mot-de-passe?token=" + jeton + "&invitation=1") + "\n\n" +
                "Si vous n'attendiez pas cette invitation, ignorez ce message.\n\n" +
                "Cordialement,\n" +
                "La Direction des Ressources Humaines";
        return dispatchEmail(user.getEmail(), "[Groupe Premium] Invitation administrateur RH", corps);
    }

    private static final String SITE_WEB = "www.groupe-premium.com";
    private static final String LOGO = "mail/logo-groupe-premium.png";
    private static final String LOGO_CID = "logoGroupePremium";
    private static final java.util.regex.Pattern URL = java.util.regex.Pattern.compile("(https?://[^\\s<]+)");

    // Corps HTML : logo en en-tête, texte du message (liens cliquables), site du groupe en pied de page
    // Même présentation que l'aperçu de l'application : en-tête (logo + service), titre, message, bloc portail, pied de page.
    // Adaptée aux téléphones : la largeur suit l'écran et les blocs s'empilent (media query + tableaux fluides).
    private String enHtml(String objet, String texte) {
        String echappe = HtmlUtils.htmlEscape(texte);
        String avecLiens = URL.matcher(echappe).replaceAll(m -> {
            String lien = m.group(1);
            return "<a href=\"" + lien + "\" style=\"color:#E4002B;word-break:break-all\">" + lien + "</a>";
        });
        String paragraphes = avecLiens.replace("\r", "").replace("\n", "<br>");
        // Le bouton ouvre l'application : l'adresse du réseau local si elle est configurée (un téléphone n'atteint pas « localhost »)
        String base = (frontendUrlReseau != null && !frontendUrlReseau.isBlank())
                ? frontendUrlReseau.replaceAll("/+$", "") : frontendUrl;
        String portail = base + "/connexion";
        return "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
                + "<style>"
                + "@media only screen and (max-width:480px){"
                + ".wrap{padding:12px 8px!important}"
                + ".card{padding:18px!important;border-radius:12px!important}"
                + ".cell{display:block!important;width:100%!important;text-align:left!important;box-sizing:border-box}"
                + ".cell-droite{padding-top:10px!important}"
                + ".titre{font-size:16px!important}"
                + ".btn{display:block!important;text-align:center!important}"
                + ".logo{width:130px!important}"
                + "}"
                + "</style></head>"
                + "<body style=\"margin:0;padding:0;background:#F5F5F7\">"
                + "<div class=\"wrap\" style=\"background:#F5F5F7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif\">"
                + "<div class=\"card\" style=\"max-width:620px;margin:0 auto;background:#FFFFFF;border:1px solid #E8E8ED;border-radius:16px;padding:28px;color:#1D1D1F\">"
                // En-tête : logo à gauche, service à droite (empilés sur téléphone)
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-bottom:1px solid #E8E8ED\"><tr>"
                + "<td class=\"cell\" align=\"left\" style=\"padding-bottom:16px\"><img class=\"logo\" src=\"cid:" + LOGO_CID + "\" alt=\"Groupe Premium\" width=\"150\" style=\"display:block;border:0;height:auto;max-width:100%\"></td>"
                + "<td class=\"cell cell-droite\" align=\"right\" style=\"padding-bottom:16px;font-size:11px;color:#6E6E73;line-height:1.5\">"
                + "<span style=\"font-family:Consolas,monospace;letter-spacing:.5px\">SYSTÈME RH AUTOMATISÉ</span><br>"
                + "<strong style=\"color:#E4002B;font-size:12px\">Direction des Ressources Humaines</strong></td>"
                + "</tr></table>"
                // Titre
                + "<h2 class=\"titre\" style=\"font-size:18px;line-height:1.35;margin:22px 0 14px;padding-bottom:10px;border-bottom:1px solid #F0F0F3;color:#1D1D1F\">"
                + HtmlUtils.htmlEscape(objet) + "</h2>"
                // Message
                + "<div style=\"font-size:14px;line-height:1.65;color:#3A3A3C\">" + paragraphes + "</div>"
                // Bloc portail : texte puis bouton (empilés sur téléphone)
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:26px 0;background:#F5F5F7;border:1px solid #E8E8ED;border-radius:12px\"><tr>"
                + "<td class=\"cell\" style=\"padding:16px\"><strong style=\"font-size:14px\">Action requise sur le portail RH</strong><br>"
                + "<span style=\"font-size:12px;color:#6E6E73\">Accès sécurisé SSO Groupe Premium</span></td>"
                + "<td class=\"cell\" align=\"right\" style=\"padding:16px\"><a class=\"btn\" href=\"" + portail + "\" style=\"display:inline-block;background:#E4002B;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px\">Accéder au portail &rarr;</a></td>"
                + "</tr></table>"
                // Pied de page
                + "<div style=\"border-top:1px solid #E8E8ED;padding-top:16px;text-align:center;font-size:12px;color:#6E6E73;line-height:1.6\">"
                + "<strong style=\"color:#3A3A3C\">GROUPE PREMIUM &bull; Direction des Ressources Humaines</strong><br>"
                + "Ce message a été généré automatiquement par le gestionnaire des périodes d'essai Groupe Premium.<br>"
                + "<span style=\"font-size:11px\">Conformément aux dispositions du Code du Travail et à la convention collective applicable.</span><br>"
                + "<a href=\"https://" + SITE_WEB + "\" style=\"color:#E4002B;text-decoration:none\">" + SITE_WEB + "</a>"
                + "</div></div></div></body></html>";
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
            // Version texte (clients sans HTML) et version HTML avec le logo et le site du groupe
            helper.setText(body + "\n\nGroupe Premium\n" + SITE_WEB, enHtml(subject, body));
            ClassPathResource logo = new ClassPathResource(LOGO);
            if (logo.exists()) {
                helper.addInline(LOGO_CID, logo, "image/png");
            }

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

        // Transaction indépendante : si l'historique ne peut pas être écrit, l'e-mail est déjà parti et l'étape du rappel reste validée
        try {
            historiqueEmailService.enregistrer(histo);
        } catch (RuntimeException e) {
            log.error("Historique e-mail non enregistré (e-mail à {} : « {} », statut {}) : {}",
                    dest, objet, histo.getStatut(), e.toString(), e);
        }
    }
}