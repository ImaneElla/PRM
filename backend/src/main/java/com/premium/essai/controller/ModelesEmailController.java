package com.premium.essai.controller;

import com.premium.essai.config.ModelesEmail;
import com.premium.essai.model.TemplateEmail;
import com.premium.essai.repository.TemplateEmailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Modèles des e-mails RH envoyés automatiquement, modifiables depuis l'écran Paramètres (Admin RH, voir SecurityConfig)
@RestController
@RequestMapping("/api/parametres/modeles-email")
@RequiredArgsConstructor
public class ModelesEmailController {

    private static final int OBJET_MAX = 200;
    private static final int CONTENU_MAX = 10_000;
    private static final Pattern CHAMP = Pattern.compile("\\{[^{}\\s]{1,40}}");

    public record ModeleDTO(String id, String nom, Integer delai, String type, String objet, String contenu,
                            boolean personnalise, List<String> champs) {
    }

    public record ModeleRequest(String objet, String contenu) {
    }

    private final TemplateEmailRepository repository;

    @GetMapping
    public List<ModeleDTO> lister() {
        return repository.findAll().stream()
                .sorted(Comparator.comparingInt(this::rang))
                .map(this::toDto)
                .toList();
    }

    @PutMapping("/{id}")
    public ModeleDTO modifier(@PathVariable String id, @RequestBody ModeleRequest requete) {
        TemplateEmail modele = trouver(id);
        String objet = requete.objet() == null ? "" : requete.objet().strip();
        String contenu = requete.contenu() == null ? "" : requete.contenu().replace("\r\n", "\n").strip();

        if (objet.isEmpty() || contenu.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'objet et le message sont obligatoires.");
        }
        if (objet.length() > OBJET_MAX || contenu.length() > CONTENU_MAX) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Texte trop long (objet : " + OBJET_MAX + " caractères, message : " + CONTENU_MAX + " au maximum).");
        }
        Set<String> inconnus = champsInconnus(objet + "\n" + contenu);
        if (!inconnus.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Champ(s) inconnu(s) : " + String.join(", ", inconnus) + ". Champs disponibles : "
                            + String.join(", ", ModelesEmail.CHAMPS_PROPOSES) + ".");
        }

        modele.setObjet(objet);
        modele.setContenu(contenu);
        return toDto(repository.save(modele));
    }

    @PostMapping("/{id}/reinitialiser")
    public ModeleDTO reinitialiser(@PathVariable String id) {
        TemplateEmail modele = trouver(id);
        ModelesEmail.Modele parDefaut = ModelesEmail.parDefaut(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucun texte par défaut pour ce modèle."));
        modele.setObjet(parDefaut.objet());
        modele.setContenu(parDefaut.contenu());
        return toDto(repository.save(modele));
    }

    private TemplateEmail trouver(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Modèle d'e-mail introuvable."));
    }

    private Set<String> champsInconnus(String texte) {
        Set<String> inconnus = new LinkedHashSet<>();
        Matcher m = CHAMP.matcher(texte);
        while (m.find()) {
            if (!ModelesEmail.CHAMPS_ACCEPTES.contains(m.group())) inconnus.add(m.group());
        }
        return inconnus;
    }

    // Ordre d'affichage : celui des modèles par défaut (J-21, J-14, J-7, retard)
    private int rang(TemplateEmail modele) {
        for (int i = 0; i < ModelesEmail.PAR_DEFAUT.size(); i++) {
            if (ModelesEmail.PAR_DEFAUT.get(i).id().equals(modele.getId())) return i;
        }
        return Integer.MAX_VALUE;
    }

    private ModeleDTO toDto(TemplateEmail modele) {
        boolean personnalise = ModelesEmail.parDefaut(modele.getId())
                .map(d -> !normaliser(d.objet()).equals(normaliser(modele.getObjet()))
                        || !normaliser(d.contenu()).equals(normaliser(modele.getContenu())))
                .orElse(false);
        return new ModeleDTO(modele.getId(), modele.getNom(), modele.getDelai(),
                modele.getTypeEmail() != null ? modele.getTypeEmail().name() : null,
                modele.getObjet(), modele.getContenu(), personnalise, ModelesEmail.CHAMPS_PROPOSES);
    }

    private static String normaliser(String texte) {
        return texte == null ? "" : texte.replace("\r\n", "\n").strip();
    }
}
