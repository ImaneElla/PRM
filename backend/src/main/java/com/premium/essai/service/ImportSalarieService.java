package com.premium.essai.service;

import com.premium.essai.dto.ImportSalarieResultDTO;
import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.dto.SalarieResponseDTO;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.Salarie;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.SalarieRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

// Import en masse de salariés : chaque ligne est créée dans sa propre transaction, une ligne invalide n'arrête pas l'import
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportSalarieService {

    public static final int MAX_LIGNES_CSV = 500;
    private static final List<String> SOCIETES = List.of("GRP", "PRO", "SRM", "AFI", "CCI", "SCP");

    private static final List<DateTimeFormatter> FORMATS_DATE = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            // STRICT : une date impossible (31/02/2026) est refusée au lieu d'être ramenée au 28 février
            strict("d/M/uuuu"), strict("d-M-uuuu"), strict("d.M.uuuu"),
            // année sur deux chiffres (14-07-25 -> 2025)
            strict("d/M/uu"), strict("d-M-uu"), strict("d.M.uu"));

    private static final int NOM = 0, PRENOM = 1, EMAIL = 2, POSTE = 3, DATE = 4, SOCIETE = 5, TELEPHONE = 6,
            RESPONSABLE = 7, COMPLET = 8, MATRICULE = 9,
            // Suivi de la période d'essai (facultatif) : voir ImportFormulaireService
            ENVOI1 = 10, FIN1 = 11, ENVOI2 = 12, FIN2 = 13, VALIDATION = 14, DATE_EFFET = 15, AXES = 16, ACC_MANAGER = 17, ACC_RH = 18;
    private static final int NB_COLONNES = 19;

    // En-têtes reconnus (voir cle()) : ce qui est écrit dans la 1re ligne du fichier
    private static final Set<String> ENTETES_NOM = Set.of("nom");
    private static final Set<String> ENTETES_PRENOM = Set.of("prenom");
    private static final Set<String> ENTETES_COMPLET = Set.of(
            "nomcomplet", "nometprenom", "nomprenom", "prenomnom", "prenometnom", "salarie", "collaborateur", "employe",
            "presentationnom", "presentation", "nomdusalarie", "nomsalarie");
    private static final Set<String> ENTETES_MATRICULE = Set.of("matricule", "mat", "nmatricule", "numeromatricule", "numerodematricule");
    private static final Set<String> ENTETES_POSTE = Set.of("poste", "fonction", "intitule", "intituledeposte", "intituleposte", "metier");
    private static final Set<String> ENTETES_DATE = Set.of(
            "dateembauche", "datedembauche", "dateentree", "datedentree", "dateintegration", "datedintegration", "date", "embauche");
    private static final Set<String> ENTETES_SOCIETE = Set.of("societe", "entite", "filiale");
    private static final Set<String> ENTETES_TELEPHONE = Set.of("telephone", "tel", "phone", "gsm", "mobile");
    private static final Set<String> ENTETES_RESPONSABLE = Set.of(
            "responsable", "emailresponsable", "responsableemail", "manager", "responsablehierarchique", "superieur", "evaluateur");

    private final SalarieService salarieService;
    private final SalarieRepository salarieRepository;
    private final ResponsableRepository responsableRepository;
    private final Validator validator;
    private final ImportFormulaireService importFormulaireService;
    private final NotificationEcheanceService notificationEcheanceService;

    // Domaine des adresses générées quand le fichier n'a pas d'e-mail (même convention que l'ajout manuel)
    @Value("${application.import.domaine-email-salaries:premium.africa}")
    private String domaineEmail;

    public record LigneCsv(int numero, String[] champs) {
    }

    public List<ImportSalarieResultDTO> importer(String contenu) {
        List<ImportSalarieResultDTO> resultats = new ArrayList<>();
        List<Responsable> responsables = responsableRepository.findAll();
        for (LigneCsv ligne : lireCsv(contenu)) {
            ImportSalarieResultDTO resultat;
            try {
                resultat = traiter(ligne, responsables);
            } catch (ResponseStatusException e) {
                resultat = ImportSalarieResultDTO.builder().statut("IGNORE").message(e.getReason()).build();
            } catch (RuntimeException e) {
                log.warn("Import salarié, ligne {} : {}", ligne.numero(), e.getMessage());
                resultat = ImportSalarieResultDTO.builder().statut("ERREUR").message("Erreur inattendue : " + e.getMessage()).build();
            }
            resultat.setLigne(ligne.numero());
            if (resultat.getEmail() == null) resultat.setEmail(champ(ligne.champs(), EMAIL));
            if (resultat.getNomComplet() == null) {
                resultat.setNomComplet((champ(ligne.champs(), PRENOM) + " " + champ(ligne.champs(), NOM)).trim());
            }
            resultats.add(resultat);
        }
        return resultats;
    }

    private ImportSalarieResultDTO traiter(LigneCsv ligne, List<Responsable> responsables) {
        String[] c = ligne.champs();
        String prenom = champ(c, PRENOM);
        String nom = champ(c, NOM);
        String matricule = champ(c, MATRICULE).replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        String societe = societe(champ(c, SOCIETE), matricule);

        String email = champ(c, EMAIL).toLowerCase(Locale.ROOT);
        boolean emailGenere = false;
        if (vide(email) && !vide(prenom) && !vide(nom)) {
            email = genererEmail(prenom, nom);
            emailGenere = true;
        }

        if (!vide(matricule) && salarieRepository.existsByMatricule(matricule)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un salarié existe déjà avec le matricule " + matricule + ".");
        }

        SalarieRequestDTO dto = SalarieRequestDTO.builder()
                .lastName(nom)
                .firstName(prenom)
                .email(email)
                .poste(champ(c, POSTE))
                .phone(vide(champ(c, TELEPHONE)) ? null : champ(c, TELEPHONE))
                .societe(societe)
                .matricule(vide(matricule) ? null : matricule)
                .dateEmbauche(lireDate(champ(c, DATE)))
                .responsableId(trouverResponsable(champ(c, RESPONSABLE), responsables))
                .build();

        List<String> erreurs = validator.validate(dto).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .map(ImportSalarieService::libelleChamp)
                .distinct()
                .collect(Collectors.toList());
        if (!erreurs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Champ(s) manquant(s) ou invalide(s) : " + String.join(", ", erreurs) + ".");
        }
        if (!vide(matricule) && !matricule.startsWith(societe)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le matricule " + matricule + " ne correspond pas à la société " + societe + ".");
        }
        if (!emailGenere && salarieRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un salarié existe déjà avec l'adresse " + email + ".");
        }

        ImportFormulaireService.DonneesFormulaire formulaire = lireFormulaire(c);
        SalarieResponseDTO cree = salarieService.createSalarie(dto);
        boolean formulaireImporte = !formulaire.vide();
        if (formulaireImporte) {
            importFormulaireService.appliquer(cree.getId(), formulaire);
            // Les échéances viennent d'être remplacées par celles du fichier : constat de retard silencieux, sans e-mail
            notificationEcheanceService.detecterRetardsDuSalarie(cree.getId(), false);
        }
        String message = "Salarié créé (matricule " + cree.getMatricule() + ")."
                + (formulaireImporte ? " Suivi de la période d'essai importé." : "")
                + (emailGenere ? " Aucune adresse dans le fichier : " + cree.getEmail() + " a été générée." : "");
        return ImportSalarieResultDTO.builder()
                .statut("CREE")
                .salarieId(cree.getId())
                .matricule(cree.getMatricule())
                .email(cree.getEmail())
                .nomComplet(cree.getFirstName() + " " + cree.getLastName())
                .message(message)
                .build();
    }

    private ImportFormulaireService.DonneesFormulaire lireFormulaire(String[] c) {
        String validation = cle(champ(c, VALIDATION));
        Boolean valide = validation.isEmpty() ? null : Set.of("oui", "o", "ok", "x", "valide", "validee").contains(validation);
        return new ImportFormulaireService.DonneesFormulaire(
                lireDate(champ(c, ENVOI1)), lireDate(champ(c, FIN1)), lireDate(champ(c, ENVOI2)), lireDate(champ(c, FIN2)),
                valide, lireDate(champ(c, DATE_EFFET)), champ(c, AXES),
                !cle(champ(c, ACC_MANAGER)).isEmpty(), !cle(champ(c, ACC_RH)).isEmpty());
    }

    // Société : colonne du fichier, sinon les 3 lettres du matricule (GRP000059 -> GRP), sinon GRP
    private String societe(String colonne, String matricule) {
        if (!vide(colonne)) return colonne.trim().toUpperCase(Locale.ROOT);
        if (matricule.length() >= 3 && SOCIETES.contains(matricule.substring(0, 3))) return matricule.substring(0, 3);
        return "GRP";
    }

    // Adresse technique prenomnom@domaine (même règle que l'ajout manuel). Si elle existe déjà pour une autre personne : prenomnom2…
    private String genererEmail(String prenom, String nom) {
        String base = lettres(prenom) + lettres(nom);
        if (base.isEmpty()) base = "salarie";
        for (int i = 1; i < 1000; i++) {
            String candidate = base + (i == 1 ? "" : i) + "@" + domaineEmail;
            Optional<Salarie> existant = salarieRepository.findByEmail(candidate);
            if (existant.isEmpty()) return candidate;
            boolean memePersonne = nomNormalise(existant.get().getFirstName(), existant.get().getLastName())
                    .equals(nomNormalise(prenom, nom));
            if (memePersonne) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce salarié existe déjà (" + candidate + ").");
            }
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Impossible de générer une adresse e-mail pour " + prenom + " " + nom + ".");
    }

    // Responsable désigné par son e-mail OU par son nom (« ERIC LEFORT » : ordre et accents sans importance)
    private Long trouverResponsable(String valeur, List<Responsable> responsables) {
        if (vide(valeur)) return null;
        if (valeur.contains("@")) {
            return responsableRepository.findByEmail(valeur.trim().toLowerCase(Locale.ROOT))
                    .map(Responsable::getId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Responsable introuvable : " + valeur + "."));
        }
        String cherche = nomNormalise(valeur);
        List<Responsable> trouves = responsables.stream()
                .filter(r -> nomNormalise(r.getFirstName(), r.getLastName()).equals(cherche))
                .toList();
        if (trouves.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Responsable introuvable : " + valeur.trim() + " (ajoutez-le d'abord dans « Gestion des responsables »).");
        }
        if (trouves.size() > 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Plusieurs responsables correspondent à « " + valeur.trim() + " » : indiquez son adresse e-mail.");
        }
        return trouves.get(0).getId();
    }

    // Mots du nom, sans accent, en minuscules, triés : « EL KHLIFI Youssef » == « Youssef El Khlifi »
    private static String nomNormalise(String... parties) {
        return Arrays.stream(String.join(" ", parties).split("[^\\p{L}]+"))
                .map(ImportSalarieService::lettres)
                .filter(m -> !m.isEmpty())
                .sorted()
                .collect(Collectors.joining(" "));
    }

    private LocalDate lireDate(String valeur) {
        if (vide(valeur)) return null;
        String texte = valeur.trim();
        for (DateTimeFormatter format : FORMATS_DATE) {
            try {
                return LocalDate.parse(texte, format);
            } catch (DateTimeParseException ignored) {
                // essaie le format suivant
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Date d'embauche invalide : " + valeur + " (formats acceptés : AAAA-MM-JJ, JJ/MM/AAAA ou JJ-MM-AA).");
    }

    public List<LigneCsv> lireCsv(String contenu) {
        String[] lignes = contenu.replace("﻿", "").split("\\r?\\n");
        List<LigneCsv> resultat = new ArrayList<>();
        // ordre par défaut sans en-tête : nom, prénom, email, poste, date, société, téléphone, responsable
        int[] colonnes = {0, 1, 2, 3, 4, 5, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1};
        boolean enTeteLue = false;

        for (int i = 0; i < lignes.length; i++) {
            String ligne = lignes[i].trim();
            if (ligne.isEmpty()) continue;
            String[] champs = Arrays.stream(ligne.split(ligne.contains(";") ? ";" : ",", -1))
                    .map(c -> c.trim().replaceAll("^\"|\"$", "").trim())
                    .toArray(String[]::new);

            if (!enTeteLue && resultat.isEmpty() && ressembleAUnEnTete(champs)) {
                colonnes = positionsEnTete(champs);
                enTeteLue = true;
                continue;
            }
            if (resultat.size() >= MAX_LIGNES_CSV) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Le fichier dépasse " + MAX_LIGNES_CSV + " lignes. Découpez-le en plusieurs imports.");
            }
            String[] reordonne = new String[NB_COLONNES];
            for (int k = 0; k < NB_COLONNES; k++) reordonne[k] = champ(champs, colonnes[k]);
            if (!reordonne[COMPLET].isBlank() && (reordonne[NOM].isBlank() || reordonne[PRENOM].isBlank())) {
                // Une seule colonne « nom complet » : on la sépare en prénom et nom
                String[] separe = NomComplet.separer(reordonne[COMPLET], reordonne[EMAIL]);
                reordonne[PRENOM] = separe[0];
                reordonne[NOM] = separe[1];
            }
            resultat.add(new LigneCsv(i + 1, reordonne));
        }
        return resultat;
    }

    // La 1re ligne est un en-tête si elle contient une colonne e-mail ou au moins deux noms de colonnes connus
    private static boolean ressembleAUnEnTete(String[] champs) {
        if (Arrays.stream(champs).anyMatch(NomComplet::estEnteteEmail)) return true;
        return Arrays.stream(champs).filter(c -> typeColonne(cle(c)) >= 0).count() >= 2;
    }

    private static int typeColonne(String cle) {
        if (cle.startsWith("presentation")) return COMPLET;
        if (ENTETES_NOM.contains(cle)) return NOM;
        if (ENTETES_PRENOM.contains(cle)) return PRENOM;
        if (NomComplet.synonymesEmail().contains(cle)) return EMAIL;
        if (ENTETES_COMPLET.contains(cle)) return COMPLET;
        if (ENTETES_MATRICULE.contains(cle)) return MATRICULE;
        if (ENTETES_POSTE.contains(cle)) return POSTE;
        if (ENTETES_DATE.contains(cle)) return DATE;
        if (ENTETES_SOCIETE.contains(cle)) return SOCIETE;
        if (ENTETES_TELEPHONE.contains(cle)) return TELEPHONE;
        if (ENTETES_RESPONSABLE.contains(cle)) return RESPONSABLE;
        if (cle.contains("accompagnement")) return cle.contains("rh") && !cle.contains("manager") ? ACC_RH : ACC_MANAGER;
        if (cle.contains("axes") || cle.contains("amelioration")) return AXES;
        if (cle.contains("effet")) return DATE_EFFET;
        if (cle.contains("validation")) return VALIDATION;
        if (cle.contains("envoi")) return ENVOI1;   // 1re occurrence = période 1, 2e = période 2 (voir positionsEnTete)
        if (cle.contains("fin") && cle.contains("essai")) return FIN1;
        return -1;
    }

    private int[] positionsEnTete(String[] entete) {
        int[] colonnes = new int[NB_COLONNES];
        Arrays.fill(colonnes, -1);
        for (int i = 0; i < entete.length; i++) {
            int type = typeColonne(cle(entete[i]));
            if (type == ENVOI1 || type == FIN1) {
                // Colonnes répétées (période 1 puis période 2) : la 2e occurrence prend le rang suivant
                if (colonnes[type] < 0) colonnes[type] = i;
                else if (colonnes[type + 2] < 0) colonnes[type + 2] = i;
            } else if (type >= 0 && colonnes[type] < 0) {
                colonnes[type] = i;
            }
        }
        boolean nomEtPrenom = colonnes[NOM] >= 0 && colonnes[PRENOM] >= 0;
        if ((!nomEtPrenom && colonnes[COMPLET] < 0) || colonnes[POSTE] < 0 || colonnes[DATE] < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "L'en-tête du fichier doit contenir : nom et prénom (ou une seule colonne « nom complet »), poste et date d'embauche. "
                            + "Colonnes facultatives : email, matricule, société, téléphone, responsable.");
        }
        return colonnes;
    }

    private static String libelleChamp(String propriete) {
        return switch (propriete) {
            case "firstName" -> "prénom";
            case "lastName" -> "nom";
            case "email" -> "email";
            case "poste" -> "poste";
            case "dateEmbauche" -> "date d'embauche";
            case "societe" -> "société (GRP, PRO, SRM, AFI, CCI ou SCP)";
            case "matricule" -> "matricule (ex. GRP000059)";
            default -> propriete;
        };
    }

    private static DateTimeFormatter strict(String modele) {
        return DateTimeFormatter.ofPattern(modele).withResolverStyle(ResolverStyle.STRICT);
    }

    // En-tête normalisé : sans accent, minuscules, sans espace ni ponctuation ("E-mail" -> "email")
    private static String cle(String valeur) {
        return NomComplet.cle(valeur);
    }

    private static String lettres(String valeur) {
        return Normalizer.normalize(valeur.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-z]", "");
    }

    private static String champ(String[] champs, int index) {
        return index >= 0 && index < champs.length && champs[index] != null ? champs[index].trim() : "";
    }

    private static boolean vide(String valeur) {
        return valeur == null || valeur.isBlank();
    }
}
