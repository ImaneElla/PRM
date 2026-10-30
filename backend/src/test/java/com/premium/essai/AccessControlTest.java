package com.premium.essai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.dto.SalarieRequestDTO;
import com.premium.essai.dto.SalarieResponseDTO;
import com.premium.essai.model.Direction;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.PeriodeEvaluationRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.SalarieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Droits par rôle : un responsable ne voit et ne modifie que son équipe ; l'Admin RH voit tout
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AccessControlTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;
    @Autowired private PeriodeEvaluationRepository periodeRepository;
    @Autowired private SalarieService salarieService;

    private String emailAdmin;
    private String emailRespoA;
    private SalarieResponseDTO salarieDeA;
    private SalarieResponseDTO salarieDeB;

    @BeforeEach
    void init() {
        Direction direction = directionRepository.save(Direction.builder().code("DIR-T").name("Direction Test").build());
        Responsable respoA = creerResponsable("a", direction);
        Responsable respoB = creerResponsable("b", direction);

        emailAdmin = creerCompte("admin", UserRole.ADMIN_RH, null);
        emailRespoA = creerCompte("respo-a", UserRole.RESPONSABLE, respoA);

        salarieDeA = creerSalarie("equipe-a", direction, respoA);
        salarieDeB = creerSalarie("equipe-b", direction, respoB);
    }

    private Responsable creerResponsable(String suffixe, Direction direction) {
        return responsableRepository.save(Responsable.builder()
                .firstName("Resp").lastName(suffixe)
                .email("resp-" + suffixe + "-" + UUID.randomUUID() + "@example.com")
                .poste("Manager").direction(direction).build());
    }

    private String creerCompte(String prefixe, UserRole role, Responsable responsable) {
        String email = prefixe + "-" + UUID.randomUUID() + "@example.com";
        userRepository.save(User.builder()
                .nom("Test").prenom("User").email(email)
                .password(passwordEncoder.encode("Secret1234"))
                .role(role).responsable(responsable).build());
        return email;
    }

    private SalarieResponseDTO creerSalarie(String prefixe, Direction direction, Responsable responsable) {
        return salarieService.createSalarie(SalarieRequestDTO.builder()
                .firstName("Sal").lastName(prefixe)
                .email(prefixe + "-" + UUID.randomUUID() + "@example.com")
                .poste("Dev").dateEmbauche(LocalDate.now())
                .directionId(direction.getId()).responsableId(responsable.getId()).build());
    }

    private String jeton(String email) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(email).password("Secret1234").build())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        return "Bearer " + json.get("token").asText();
    }

    private Long idPeriode(SalarieResponseDTO salarie) {
        return periodeRepository.findBySalarieId(salarie.getId()).get(0).getId();
    }

    @Test
    void responsableOnlySeesOwnSalaries() throws Exception {
        String token = jeton(emailRespoA);

        mockMvc.perform(get("/api/salaries").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(salarieDeA.getId()));

        mockMvc.perform(get("/api/salaries/" + salarieDeA.getId()).header("Authorization", token))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/salaries/" + salarieDeB.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
    }

    @Test
    void responsableRetrouveSaPropreFicheEtSeulementLa() throws Exception {
        mockMvc.perform(get("/api/compte/moi").header("Authorization", jeton(emailRespoA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Resp"))
                .andExpect(jsonPath("$.lastName").value("a"))
                .andExpect(jsonPath("$.id").isNumber());

        // Un Admin RH n'a pas de fiche responsable ; un compte responsable non relié non plus
        mockMvc.perform(get("/api/compte/moi").header("Authorization", jeton(emailAdmin)))
                .andExpect(status().isNotFound());
        String sansFiche = creerCompte("respo-sans-fiche", UserRole.RESPONSABLE, null);
        mockMvc.perform(get("/api/compte/moi").header("Authorization", jeton(sansFiche)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/compte/moi")).andExpect(status().is4xxClientError());
    }

    @Test
    void adminSeesAllSalaries() throws Exception {
        mockMvc.perform(get("/api/salaries").header("Authorization", jeton(emailAdmin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void responsableOnlySeesOwnPeriodes() throws Exception {
        mockMvc.perform(get("/api/periodes").header("Authorization", jeton(emailRespoA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].salarieId").value(salarieDeA.getId()));
    }

    @Test
    void responsableCannotReadOrFillAnotherTeamsEvaluation() throws Exception {
        String token = jeton(emailRespoA);

        mockMvc.perform(get("/api/evaluations/periode/" + idPeriode(salarieDeB)).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/evaluations/" + idPeriode(salarieDeB) + "/soumettre")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "noteCompetencesPro", 4.0, "noteAptitudesPerso", 4.0, "noteQSE", 4.0,
                                "recommandationEvaluateur", "CONFIRMATION_CDI",
                                "jsonReponsesCriteres", "{}"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void responsableCannotManageSalariesOrAdminResources() throws Exception {
        String token = jeton(emailRespoA);

        mockMvc.perform(delete("/api/salaries/" + salarieDeA.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/salaries/" + salarieDeA.getId() + "/demission").header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/responsables").header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/notifications").header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/dashboard/audit-emails").header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/parametres")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("nomExpediteur", "Pirate"))))
                .andExpect(status().isForbidden());
    }
}
