package com.premium.essai.config;

import com.premium.essai.model.enums.TypeEmail;

import java.util.List;

// Modèles d'e-mail RH par défaut. Champs utilisables : {nom_manager}, {nom_salarie}, {date_echeance}, {date_limite},
// {lien_evaluation} (formulaire direct), {lien_application} (page de connexion), {identifiant}, {jours_retard}.
// Le mot de passe n'est jamais envoyé par e-mail (seule son empreinte existe en base) : on renvoie vers « Mot de passe oublié ».
public final class ModelesEmail {

    public record Modele(String id, String nom, int delai, TypeEmail type, String objet, String contenu,
                  String ancienObjet, String ancienContenu) {
    }

    private static final String ACCES = """
            Accès à l'application AuditEssai RH :
            - Lien : {lien_evaluation}
            - Identifiant : {identifiant}
            - Mot de passe : celui choisi lors de votre première connexion (en cas d'oubli, utilisez « Mot de passe oublié » sur la page de connexion)
            """;

    public static final List<Modele> PAR_DEFAUT = List.of(
            new Modele("email_j21", "Invitation Initiale Évaluation (J-21)", 21, TypeEmail.EMAIL_1_PREMIER_RAPPEL,
                    "[Évaluation période d'essai] Entretien d'évaluation de {nom_salarie}",
                    """
                    Bonjour {nom_manager},

                    La première période d’essai de {nom_salarie} prendra fin le {date_echeance}.

                    À ce titre, je te remercie de bien vouloir organiser l’entretien d’évaluation en présence du salarié, en t’appuyant sur la grille d’évaluation ci-jointe.

                    Je te prie de nous transmettre la grille complétée et signée par les deux parties avant le {date_limite}.

                    Cet entretien a pour objectif de procéder à une évaluation structurée et objective de la période d’essai, de partager les constats, de formaliser la décision retenue et, le cas échéant, de préciser les axes d’amélioration attendus.

                    """ + ACCES + """

                    Je reste à ta disposition pour toute information complémentaire.

                    Cordialement,
                    Service des Ressources Humaines""",
                    "[Évaluation Période d'Essai] Lancement de l'évaluation de {nom_salarie}",
                    String.join("\n",
                            "Bonjour {nom_manager},", "",
                            "La période d'essai de {nom_salarie} arrive à échéance le {date_echeance}.", "",
                            "Vous êtes invité(e) dès à présent à compléter son formulaire d'évaluation en cliquant sur le lien sécurisé ci-dessous :",
                            "🔗 {lien_evaluation}", "",
                            "Merci de finaliser cette évaluation avant la date limite.", "",
                            "Cordialement,", "La Direction des Ressources Humaines")),

            new Modele("email_j14", "Rappel Évaluation en Attente (J-14)", 14, TypeEmail.EMAIL_2_SECOND_RAPPEL,
                    "RAPPEL : évaluation de la période d'essai de {nom_salarie} non reçue",
                    """
                    Bonjour {nom_manager},

                    Nous revenons vers toi concernant l’évaluation de la première période d’essai de {nom_salarie}, dont l’échéance est prévue le {date_echeance}.

                    À ce jour, nous n’avons pas encore reçu la grille d’évaluation complétée et signée par les deux parties.

                    Nous te remercions de bien vouloir procéder à l’entretien d’évaluation et de nous transmettre le document dans les meilleurs délais, afin de permettre le suivi administratif de cette période d’essai.

                    """ + ACCES + """

                    Merci pour ta collaboration et ton retour.

                    Cordialement,
                    Service des Ressources Humaines""",
                    "RAPPEL : Évaluation période d'essai de {nom_salarie} en attente",
                    String.join("\n",
                            "Bonjour {nom_manager},", "",
                            "Sauf erreur de notre part, l'évaluation de la période d'essai de {nom_salarie} n'a pas encore été complétée.", "",
                            "Pour rappel, la date d'échéance est fixée au {date_echeance}.", "",
                            "Merci de vous connecter rapidement pour soumettre votre avis :",
                            "🔗 {lien_evaluation}", "",
                            "Ce délai est impératif pour respecter les obligations légales et contractuelles.", "",
                            "Cordialement,", "La Direction des Ressources Humaines")),

            // Dernier rappel avant l'échéance (copie à la RH) : même fond qu'avant, avec les informations d'accès
            new Modele("email_j7", "Alerte Critique Évaluation (J-7)", 7, TypeEmail.EMAIL_3_DERNIER_RAPPEL,
                    "[URGENT] Évaluation de la période d'essai de {nom_salarie} - Action requise",
                    """
                    Bonjour {nom_manager},

                    L'évaluation de la période d'essai de {nom_salarie} arrive à son terme critique (échéance au {date_echeance}).

                    En l'absence de retour, le dossier passera sous la supervision directe de la Direction RH.

                    Merci de réaliser l'entretien d'évaluation et de compléter la grille sans attendre.

                    """ + ACCES + """

                    En cas de difficulté, contactez d'urgence le service RH.

                    Cordialement,
                    Service des Ressources Humaines""",
                    "[URGENT / RETARD] Dossier d'essai de {nom_salarie} - Action requise sous 24h",
                    String.join("\n",
                            "Bonjour {nom_manager},", "",
                            "L'évaluation de la période d'essai de {nom_salarie} arrive à son terme critique (échéance au {date_echeance}).", "",
                            "En l'absence de retour, le dossier passe sous la supervision directe de la Direction RH.", "",
                            "Veuillez remplir immédiatement le formulaire via ce lien prioritaire :",
                            "🔗 {lien_evaluation}", "",
                            "En cas de difficulté, contactez d'urgence le service RH.", "",
                            "Cordialement,", "La Direction des Ressources Humaines")),

            // Envoyé le lendemain de l'échéance, quand le dossier est bloqué (remplace l'ancien texte écrit dans le code)
            new Modele("email_retard", "Retard critique - évaluation en attente (J+1)", -1, TypeEmail.EMAIL_3_EN_RETARD,
                    "URGENT : [RETARD CRITIQUE +{jours_retard}j] Évaluation de la période d'essai de {nom_salarie} en attente",
                    """
                    Bonjour {nom_manager},

                    Nous attirons ton attention sur le retard constaté concernant l’évaluation de la période d’essai de {nom_salarie}.

                    Malgré notre précédent message de rappel, la grille d’évaluation complétée et signée par les deux parties ne nous est toujours pas parvenue.

                    Compte tenu du dépassement de l’échéance du {date_echeance}, nous te demandons de prendre les dispositions nécessaires afin de réaliser l’entretien d’évaluation et de nous transmettre le document dans les plus brefs délais.

                    Il est important de régulariser cette situation rapidement afin de formaliser la décision relative à la période d’essai et d'assurer le suivi RH du salarié.

                    """ + ACCES + """

                    Nous comptons sur ta réactivité pour traiter cette situation en priorité.

                    Cordialement,
                    Service des Ressources Humaines""",
                    null, null),

            // Envoyé à TOUS les administrateurs dès qu'un responsable remplit l'évaluation (délai -2 = « à la soumission »)
            new Modele("email_evaluation_recue", "Évaluation reçue (envoyé aux administrateurs)", -2, TypeEmail.CONFIRMATION_RH,
                    "Évaluation reçue : {nom_salarie} ({matricule})",
                    """
                    Bonjour {nom_admin},

                    {nom_manager} vient de remplir l’évaluation de la période d’essai de {nom_salarie} (matricule : {matricule}).

                    - Note globale : {note_globale}
                    - Recommandation du responsable : {recommandation}
                    - Date de soumission : {date_soumission}

                    Vous pouvez consulter le détail de l’évaluation et enregistrer la décision RH dans l’application :
                    {lien_application}

                    Cordialement,
                    Service des Ressources Humaines""",
                    null, null)
    );

    // Champs proposés dans l'écran Paramètres
    public static final List<String> CHAMPS_PROPOSES = List.of(
            "{nom_manager}", "{nom_salarie}", "{date_echeance}", "{date_limite}",
            "{lien_evaluation}", "{lien_application}", "{identifiant}", "{jours_retard}",
            "{nom_admin}", "{matricule}", "{note_globale}", "{recommandation}", "{date_soumission}");

    // Champs acceptés à l'enregistrement : les précédents + les anciens noms. Un champ inconnu serait envoyé tel quel.
    public static final List<String> CHAMPS_ACCEPTES = List.of(
            "{nom_manager}", "{responsable}", "{nom_salarie}", "{salarie}", "{date_echeance}", "{echeance}",
            "{date_limite}", "{lien_evaluation}", "{lien}", "{lien_application}", "{identifiant}",
            "{mot_de_passe_temporaire}", "{jours_retard}",
            "{nom_admin}", "{matricule}", "{note_globale}", "{recommandation}", "{date_soumission}");

    public static java.util.Optional<Modele> parDefaut(String id) {
        return PAR_DEFAUT.stream().filter(m -> m.id().equals(id)).findFirst();
    }

    private ModelesEmail() {
    }
}
