package com.premium.essai.service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

// Aides pour les fichiers d'import qui n'ont qu'une colonne « nom complet » (ex. « ERIC LEFORT ») au lieu de « nom » et « prénom »
public final class NomComplet {

    private static final Set<String> ENTETES_EMAIL = Set.of("email", "mail", "courriel", "adresseemail", "adressemail");
    private static final Set<String> ENTETES_NOM_COMPLET = Set.of(
            "nomcomplet", "nometprenom", "nomprenom", "prenomnom", "prenometnom", "collaborateur", "employe");

    private NomComplet() {
    }

    /* En-tête normalisé : minuscules, sans accent, uniquement des lettres ("E-mail" -> "email"). */
    public static String cle(String valeur) {
        return Normalizer.normalize(valeur.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-z]", "");
    }

    public static boolean estEntete(String valeur, Set<String> synonymes) {
        return synonymes.contains(cle(valeur));
    }

    public static boolean estEnteteEmail(String valeur) {
        return estEntete(valeur, ENTETES_EMAIL);
    }

    public static boolean estEnteteNomComplet(String valeur) {
        return estEntete(valeur, ENTETES_NOM_COMPLET);
    }

    public static Set<String> synonymesEmail() {
        return ENTETES_EMAIL;
    }

    /*
     * Sépare un nom complet en {prénom, nom}. Par défaut le premier mot est le prénom (« ERIC LEFORT », « YOUNES EL FETHOUNI »).
     * Si l'adresse e-mail est de la forme prenom.nom@ et que le prénom figure en dernier (« LEFORT ERIC »), l'ordre est inversé.
     * Un texte entièrement en majuscules est remis en casse normale (« Eric Lefort »).
     */
    public static String[] separer(String complet, String email) {
        String texte = complet == null ? "" : complet.trim();
        if (texte.isEmpty()) return new String[]{"", ""};
        String[] mots = texte.split("\\s+");
        if (mots.length == 1) return new String[]{"", capitaliser(mots[0])};

        String prenomEmail = prenomDeLEmail(email);
        boolean prenomEnDernier = !prenomEmail.isEmpty()
                && lettres(mots[mots.length - 1]).equals(prenomEmail)
                && !lettres(mots[0]).equals(prenomEmail);

        String prenom;
        String nom;
        if (prenomEnDernier) {
            prenom = mots[mots.length - 1];
            nom = String.join(" ", Arrays.copyOfRange(mots, 0, mots.length - 1));
        } else {
            prenom = mots[0];
            nom = String.join(" ", Arrays.copyOfRange(mots, 1, mots.length));
        }
        return new String[]{capitaliser(prenom), capitaliser(nom)};
    }

    private static String prenomDeLEmail(String email) {
        if (email == null) return "";
        String local = email.trim().toLowerCase(Locale.ROOT);
        int arobase = local.indexOf('@');
        if (arobase > 0) local = local.substring(0, arobase);
        int point = local.indexOf('.');
        return point > 0 ? lettres(local.substring(0, point)) : "";
    }

    private static String lettres(String valeur) {
        return Normalizer.normalize(valeur.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-z]", "");
    }

    // « EL FETHOUNI » -> « El Fethouni » ; un texte déjà en casse mixte est laissé tel quel
    static String capitaliser(String texte) {
        if (!texte.equals(texte.toUpperCase(Locale.ROOT))) return texte;
        StringBuilder resultat = new StringBuilder();
        boolean debutMot = true;
        for (char c : texte.toLowerCase(Locale.ROOT).toCharArray()) {
            resultat.append(debutMot ? Character.toUpperCase(c) : c);
            debutMot = c == ' ' || c == '-' || c == '\'' || c == '’';
        }
        return resultat.toString();
    }
}
