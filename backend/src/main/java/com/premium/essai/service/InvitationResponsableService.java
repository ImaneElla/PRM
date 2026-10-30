package com.premium.essai.service;

import com.premium.essai.dto.InvitationResultDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;


@Service
@RequiredArgsConstructor
@Slf4j
public class InvitationResponsableService {

    public static final List<String> SOCIETES = List.of("GRP", "PRO", "SRM", "AFI", "CCI", "SCP");
    public static final int MAX_LIGNES_CSV = 500;

    // Sans caractères ambigus (0/O, 1/l/I) pour faciliter la saisie
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final String CHIFFRES = "23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final ResponsableRepository responsableRepository;
    private final DirectionRepository directionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public record LigneCsv(int numero, String nom, String prenom, String email, String societe) {
    }

    @Transactional
    public InvitationResultDTO inviter(String prenom, String nom, String email, String societe) {
        if (estVide(prenom) || estVide(nom) || estVide(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nom, le prénom et l'email sont obligatoires.");
        }
        String emailNormalise = email.trim().toLowerCase(Locale.ROOT);
        if (!EMAIL.matcher(emailNormalise).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adresse e-mail invalide : " + email.trim());
        }
        if (userRepository.findByEmailIgnoreCase(emailNormalise).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un compte existe déjà pour " + emailNormalise + ".");
        }

        Responsable responsable = responsableRepository.findByEmail(emailNormalise)
                .orElseGet(() -> creerResponsable(prenom.trim(), nom.trim(), emailNormalise, societe));
        return creerCompte(responsable);
    }

    @Transactional
    public InvitationResultDTO inviterExistant(Long responsableId) {
        Responsable responsable = responsableRepository.findById(responsableId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Responsable introuvable."));

        return userRepository.findByEmailIgnoreCase(responsable.getEmail())
                .map(user -> {
                    if (!user.isMustChangePassword()) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce responsable a déjà activé son compte.");
                    }
                    String motDePasse = genererMotDePasseTemporaire();
                    user.setPassword(passwordEncoder.encode(motDePasse));
                    userRepository.save(user);
                    return resultat("RENVOYEE", responsable, user, motDePasse);
                })
                .orElseGet(() -> creerCompte(responsable));
    }

    @Transactional(readOnly = true)
    public String statutCompte(Responsable responsable) {
        return userRepository.findByEmailIgnoreCase(responsable.getEmail())
                .map(user -> user.isMustChangePassword() ? "INVITE" : "ACTIF")
                .orElse("AUCUN");
    }

    public List<LigneCsv> lireCsv(String contenu) {
        String[] lignes = contenu.replace("﻿", "").split("\\r?\\n");
        List<LigneCsv> resultat = new ArrayList<>();
        int[] colonnes = {0, 1, 2, 3, -1}; // nom, prénom, email, société, nom complet (si une seule colonne « Responsable »)
        boolean enTeteLue = false;

        for (int i = 0; i < lignes.length; i++) {
            String ligne = lignes[i].trim();
            if (ligne.isEmpty()) continue;
            String[] champs = Arrays.stream(ligne.split(ligne.contains(";") ? ";" : ",", -1))
                    .map(c -> c.trim().replaceAll("^\"|\"$", "").trim())
                    .toArray(String[]::new);

            if (!enTeteLue && resultat.isEmpty()
                    && Arrays.stream(champs).anyMatch(NomComplet::estEnteteEmail)) {
                colonnes = positionsEnTete(champs);
                enTeteLue = true;
                continue;
            }
            if (resultat.size() >= MAX_LIGNES_CSV) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Le fichier dépasse " + MAX_LIGNES_CSV + " lignes. Découpez-le en plusieurs imports.");
            }
            String nom = champ(champs, colonnes[0]);
            String prenom = champ(champs, colonnes[1]);
            String email = champ(champs, colonnes[2]);
            if (colonnes[4] >= 0 && (nom.isBlank() || prenom.isBlank())) {
                // Une seule colonne « Responsable » avec le nom complet : on la sépare en prénom et nom
                String[] separe = NomComplet.separer(champ(champs, colonnes[4]), email);
                prenom = separe[0];
                nom = separe[1];
            }
            resultat.add(new LigneCsv(i + 1, nom, prenom, email, champ(champs, colonnes[3])));
        }
        return resultat;
    }

    private InvitationResultDTO creerCompte(Responsable responsable) {
        String motDePasse = genererMotDePasseTemporaire();
        User user = userRepository.save(User.builder()
                .email(responsable.getEmail().trim().toLowerCase(Locale.ROOT))
                .nom(responsable.getLastName())
                .prenom(responsable.getFirstName())
                .password(passwordEncoder.encode(motDePasse))
                .role(UserRole.RESPONSABLE)
                .responsable(responsable)
                .mustChangePassword(true)
                .build());
        return resultat("CREE", responsable, user, motDePasse);
    }

    private InvitationResultDTO resultat(String statut, Responsable responsable, User user, String motDePasse) {
        boolean envoye = mailService.sendInvitationResponsable(user, motDePasse);
        if (!envoye) {
            log.warn("Invitation non envoyée par e-mail au responsable {}", responsable.getId());
        }
        return InvitationResultDTO.builder()
                .statut(statut)
                .responsableId(responsable.getId())
                .email(user.getEmail())
                .nomComplet(responsable.getFirstName() + " " + responsable.getLastName())
                .emailEnvoye(envoye)
                .motDePasseTemporaire(envoye ? null : motDePasse)
                .message(envoye
                        ? "Invitation envoyée."
                        : "Compte créé, mais l'e-mail n'a pas pu être envoyé : transmettez le mot de passe temporaire.")
                .build();
    }

    private Responsable creerResponsable(String prenom, String nom, String email, String societe) {
        Direction direction = directionRepository.findAll().stream().findFirst()
                .orElseGet(() -> directionRepository.save(Direction.builder()
                        .name("Direction Générale")
                        .code("DG")
                        .description("Affectation interne historique")
                        .build()));
        Responsable responsable = new Responsable();
        responsable.setFirstName(prenom);
        responsable.setLastName(nom);
        responsable.setEmail(email);
        responsable.setSociete(normaliserSociete(societe));
        responsable.setDirection(direction);
        responsable.setDirectionName(direction.getName());
        return responsableRepository.save(responsable);
    }

    private String normaliserSociete(String societe) {
        String normalisee = estVide(societe) ? "GRP" : societe.trim().toUpperCase(Locale.ROOT);
        if (!SOCIETES.contains(normalisee)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Société invalide : " + societe + " (valeurs acceptées : " + String.join(", ", SOCIETES) + ").");
        }
        return normalisee;
    }

    private String genererMotDePasseTemporaire() {
        StringBuilder motDePasse = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            motDePasse.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        // Au moins un chiffre, comme l'exige la règle des mots de passe
        motDePasse.setCharAt(RANDOM.nextInt(12), CHIFFRES.charAt(RANDOM.nextInt(CHIFFRES.length())));
        return motDePasse.toString();
    }

    private int[] positionsEnTete(String[] entete) {
        int[] colonnes = {-1, -1, -1, -1, -1};
        for (int i = 0; i < entete.length; i++) {
            String cle = NomComplet.cle(entete[i]);
            if (cle.equals("nom")) colonnes[0] = i;
            else if (cle.equals("prenom")) colonnes[1] = i;
            else if (NomComplet.synonymesEmail().contains(cle)) colonnes[2] = i;
            else if (cle.equals("societe")) colonnes[3] = i;
            // « Responsable » = nom complet dans ce fichier (une seule colonne pour le prénom et le nom)
            else if (cle.equals("responsable") || NomComplet.estEnteteNomComplet(entete[i])) colonnes[4] = i;
        }
        boolean nomEtPrenom = colonnes[0] >= 0 && colonnes[1] >= 0;
        if (colonnes[2] < 0 || (!nomEtPrenom && colonnes[4] < 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "L'en-tête du fichier doit contenir une colonne e-mail (email ou mail) et soit « nom » et « prénom », "
                            + "soit une seule colonne « responsable » (nom complet).");
        }
        return colonnes;
    }

    private static String champ(String[] champs, int index) {
        return index >= 0 && index < champs.length ? champs[index] : "";
    }

    private static String sansAccent(String valeur) {
        return Normalizer.normalize(valeur.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }

    private static boolean estVide(String valeur) {
        return valeur == null || valeur.isBlank();
    }
}
