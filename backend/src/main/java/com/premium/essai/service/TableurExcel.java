package com.premium.essai.service;

import com.premium.essai.dto.SalarieResponseDTO;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Locale;

public final class TableurExcel {

    public static final String TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private TableurExcel() {
    }

    /* Texte analysable par l'import : Excel (.xlsx / .xls) converti, sinon CSV (UTF-8 ou Windows-1252). */
    public static String enTexte(byte[] octets, String nomFichier) {
        if (!estExcel(octets, nomFichier)) {
            return CsvEncodage.decoder(octets);
        }
        try (Workbook classeur = WorkbookFactory.create(new ByteArrayInputStream(octets))) {
            if (classeur.getNumberOfSheets() == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le fichier Excel ne contient aucune feuille.");
            }
            return convertir(classeur.getSheetAt(0), classeur.getCreationHelper().createFormulaEvaluator());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (LinkageError e) {
            // Bibliothèque Excel non chargée (ex. serveur démarré avant une mise à jour, ou fichiers recompilés en cours d'exécution)
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Lecture Excel indisponible sur le serveur : redémarrez-le puis réessayez.");
        } catch (IOException | RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Fichier Excel illisible : utilisez un fichier .xlsx non protégé par mot de passe.");
        }
    }

    private static boolean estExcel(byte[] octets, String nomFichier) {
        String nom = nomFichier == null ? "" : nomFichier.toLowerCase(Locale.ROOT);
        boolean zip = octets.length > 3 && octets[0] == 0x50 && octets[1] == 0x4B;                       // .xlsx
        boolean ole = octets.length > 3 && (octets[0] & 0xFF) == 0xD0 && (octets[1] & 0xFF) == 0xCF;     // .xls
        return nom.endsWith(".xlsx") || nom.endsWith(".xls") || zip || ole;
    }

    private static String convertir(Sheet feuille, FormulaEvaluator evaluateur) {
        DataFormatter formateur = new DataFormatter(Locale.FRANCE);
        int dernier = feuille.getLastRowNum();
        StringBuilder texte = new StringBuilder();
        // Une ligne de texte par ligne Excel (les lignes vides restent vides) : les numéros d'erreur correspondent à Excel
        for (int i = 0; i <= dernier; i++) {
            Row ligne = feuille.getRow(i);
            if (ligne != null) {
                int colonnes = Math.max(ligne.getLastCellNum(), 0);
                StringBuilder valeurs = new StringBuilder();
                boolean toutVide = true;
                for (int c = 0; c < colonnes; c++) {
                    String valeur = valeurCellule(ligne.getCell(c), formateur, evaluateur);
                    if (!valeur.isEmpty()) toutVide = false;
                    if (c > 0) valeurs.append(';');
                    valeurs.append(valeur);
                }
                if (!toutVide) texte.append(valeurs);
            }
            texte.append('\n');
        }
        return texte.toString();
    }

    private static String valeurCellule(Cell cellule, DataFormatter formateur, FormulaEvaluator evaluateur) {
        if (cellule == null) return "";
        CellType type = cellule.getCellType() == CellType.FORMULA ? cellule.getCachedFormulaResultType() : cellule.getCellType();
        String valeur;
        if (type == CellType.NUMERIC && DateUtil.isCellDateFormatted(cellule)) {
            // Date Excel -> AAAA-MM-JJ, quel que soit l'affichage choisi dans Excel
            valeur = cellule.getLocalDateTimeCellValue().toLocalDate().toString();
        } else {
            valeur = formateur.formatCellValue(cellule, evaluateur);
        }
        // Le séparateur et les retours à la ligne ne doivent pas casser la ligne
        return valeur.replace(';', ',').replace('\r', ' ').replace('\n', ' ').trim();
    }


    public static byte[] modeleSalaries() {
        return modele("Salariés",
                List.of("nom", "prénom", "email", "poste", "date d'embauche", "société", "téléphone", "responsable (e-mail)",
                        "date d'envoi fiche d'évaluation (période 1)", "date de fin de période d'essai (période 1)",
                        "date d'envoi fiche d'évaluation (période 2)", "date de fin de période d'essai (période 2)",
                        "validation période d'essai", "date d'effet validation", "axes d'amélioration", "accompagnement manager", "accompagnement RH"),
                null,
                new int[]{18, 16, 32, 20, 18, 10, 16, 30, 24, 24, 24, 24, 18, 18, 40, 16, 16},
                4);
    }

    private static final List<String> ENTETES_EXPORT_SALARIES = List.of(
            "Matricule", "Nom", "Prénom", "E-mail", "Poste", "Société", "Date d'embauche",
            "Fin prévisionnelle", "Responsable", "Direction", "Statut de l'essai", "Actif");

    /* Export : un classeur .xlsx avec une ligne par salarié réellement fourni (jamais d'exemple ni de donnée fictive). */
    public static byte[] exportSalaries(List<SalarieResponseDTO> salaries) {
        try (XSSFWorkbook classeur = new XSSFWorkbook(); ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            Sheet feuille = classeur.createSheet("Salariés");
            CreationHelper aide = classeur.getCreationHelper();

            Font gras = classeur.createFont();
            gras.setBold(true);
            CellStyle styleEntete = classeur.createCellStyle();
            styleEntete.setFont(gras);
            styleEntete.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            styleEntete.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            // Vraies dates Excel (triables, filtrables), affichées JJ/MM/AAAA
            CellStyle styleDate = classeur.createCellStyle();
            styleDate.setDataFormat(aide.createDataFormat().getFormat("dd/mm/yyyy"));
            // Texte : garde le matricule et les valeurs tels quels
            CellStyle styleTexte = classeur.createCellStyle();
            styleTexte.setDataFormat(aide.createDataFormat().getFormat("@"));
            // Texte « préfixé » : une valeur commençant par = + - @ reste du texte, sans altérer la valeur
            styleTexte.setQuotePrefixed(true);

            Row entete = feuille.createRow(0);
            for (int c = 0; c < ENTETES_EXPORT_SALARIES.size(); c++) {
                Cell cellule = entete.createCell(c);
                cellule.setCellValue(ENTETES_EXPORT_SALARIES.get(c));
                cellule.setCellStyle(styleEntete);
            }

            int numero = 1;
            for (SalarieResponseDTO s : salaries) {
                Row ligne = feuille.createRow(numero++);
                texte(ligne, 0, s.getMatricule(), styleTexte);
                texte(ligne, 1, s.getLastName(), styleTexte);
                texte(ligne, 2, s.getFirstName(), styleTexte);
                texte(ligne, 3, s.getEmail(), styleTexte);
                texte(ligne, 4, s.getPoste(), styleTexte);
                texte(ligne, 5, s.getSociete(), styleTexte);
                date(ligne, 6, s.getDateEmbauche(), styleDate);
                date(ligne, 7, s.getDateFinPrevisionnelle(), styleDate);
                texte(ligne, 8, s.getResponsableNomComplet(), styleTexte);
                texte(ligne, 9, s.getDirectionName(), styleTexte);
                texte(ligne, 10, s.getStatutEssai(), styleTexte);
                texte(ligne, 11, s.isActif() ? "Oui" : "Non", styleTexte);
            }

            int[] largeurs = {14, 20, 18, 34, 24, 10, 16, 18, 26, 22, 18, 8};
            for (int c = 0; c < largeurs.length; c++) {
                feuille.setColumnWidth(c, largeurs[c] * 256);
            }
            feuille.createFreezePane(0, 1);

            classeur.write(sortie);
            return sortie.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Impossible de générer l'export Excel des salariés", e);
        }
    }

    private static void texte(Row ligne, int colonne, String valeur, CellStyle style) {
        Cell cellule = ligne.createCell(colonne);
        cellule.setCellStyle(style);
        if (valeur == null || valeur.isBlank()) return;
        cellule.setCellValue(valeur);
    }

    private static void date(Row ligne, int colonne, java.time.LocalDate valeur, CellStyle style) {
        Cell cellule = ligne.createCell(colonne);
        cellule.setCellStyle(style);
        if (valeur != null) cellule.setCellValue(valeur);
    }

    public static byte[] modeleResponsables() {
        return modele("Responsables",
                List.of("nom", "prénom", "email", "société"),
                List.of("Dupont", "Marie", "marie.dupont@exemple.com", "GRP"),
                new int[]{18, 16, 32, 10},
                -1);
    }

    private static byte[] modele(String nomFeuille, List<String> entetes, List<String> exemple, int[] largeurs, int colonneDate) {
        try (XSSFWorkbook classeur = new XSSFWorkbook(); ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            Sheet feuille = classeur.createSheet(nomFeuille);
            CreationHelper aide = classeur.getCreationHelper();

            Font gras = classeur.createFont();
            gras.setBold(true);
            CellStyle styleEntete = classeur.createCellStyle();
            styleEntete.setFont(gras);
            styleEntete.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            styleEntete.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            CellStyle styleTexte = classeur.createCellStyle();
            styleTexte.setDataFormat(aide.createDataFormat().getFormat("@")); // texte : garde le 0 de « 06… »

            Row ligneEntete = feuille.createRow(0);
            Row ligneExemple = exemple == null ? null : feuille.createRow(1);
            for (int c = 0; c < entetes.size(); c++) {
                Cell entete = ligneEntete.createCell(c);
                entete.setCellValue(entetes.get(c));
                entete.setCellStyle(styleEntete);
                if (ligneExemple != null) {
                    Cell valeur = ligneExemple.createCell(c);
                    valeur.setCellStyle(styleTexte);
                    valeur.setCellValue(exemple.get(c));
                }
                feuille.setColumnWidth(c, largeurs[c] * 256);
            }
            feuille.createFreezePane(0, 1);

            Sheet aideFeuille = classeur.createSheet("Mode d'emploi");
            String[] lignes = colonneDate >= 0
                    ? new String[]{
                        "Remplissez la feuille « Salariés », une ligne par salarié, puis importez le fichier dans l'application.",
                        "Colonnes obligatoires : nom, prénom, email, poste, date d'embauche.",
                        "Facultatives : société (GRP, PRO, SRM, AFI, CCI ou SCP ; GRP par défaut), téléphone, responsable (son e-mail, ou son nom complet ; il doit déjà exister dans « Gestion des responsables »).",
                        "Suivi (facultatif, pour reprendre un historique) : dates d'envoi/fin des périodes 1 et 2, validation (OUI), date d'effet, axes d'amélioration, accompagnement manager / RH (une croix suffit). Aucun e-mail n'est envoyé pour ces données.",
                        "Date d'embauche : une vraie date Excel, ou au format AAAA-MM-JJ / JJ/MM/AAAA.",
                        "Téléphone : formatez la colonne en « Texte » pour conserver le 0 initial.",
                        "Maximum 500 lignes par fichier ; une ligne en erreur n'empêche pas l'import des autres."}
                    : new String[]{
                        "Remplissez la feuille « Responsables », une ligne par responsable, puis importez le fichier.",
                        "Remplacez ou supprimez la ligne d'exemple (ligne 2).",
                        "Colonnes obligatoires : nom, prénom, email. Facultative : société (GRP par défaut).",
                        "Chaque responsable reçoit une invitation par e-mail pour activer son compte.",
                        "Maximum 500 lignes par fichier."};
            for (int i = 0; i < lignes.length; i++) {
                aideFeuille.createRow(i).createCell(0).setCellValue(lignes[i]);
            }
            aideFeuille.setColumnWidth(0, 110 * 256);

            classeur.write(sortie);
            return sortie.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Impossible de générer le modèle Excel", e);
        }
    }
}
