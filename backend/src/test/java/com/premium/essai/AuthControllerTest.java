package com.premium.essai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User creerCompte(String email, String password, UserRole role, boolean mustChangePassword) {
        return userRepository.save(User.builder()
                .nom("Test")
                .prenom("User")
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(role)
                .mustChangePassword(mustChangePassword)
                .build());
    }

    private String connecter(String email, String password) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(email).password(password).build())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        return json.get("token").asText();
    }

    @Test
    void loginIsAvailableWithoutAuthentication() throws Exception {
        String email = "auth-" + UUID.randomUUID() + "@example.com";
        String password = "ValidPassword123!";
        creerCompte(email, password, UserRole.ADMIN_RH, false);

        mockMvc.perform(post("/api/auth/login")
                        .header("Authorization", "Bearer not-a-jwt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(email.toUpperCase()).password(password).build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.mustChangePassword").value(false));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(email).password("WrongPassword123!").build())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Email ou mot de passe incorrect."));
    }

    @Test
    void publicRegistrationIsDisabled() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nom", "Pirate", "prenom", "Test", "email", "pirate@example.com",
                                "password", "Password123", "role", "ADMIN_RH"))))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void temporaryPasswordMustBeChangedBeforeUsingTheApi() throws Exception {
        String email = "resp-" + UUID.randomUUID() + "@example.com";
        creerCompte(email, "Temporaire9x", UserRole.RESPONSABLE, true);

        String token = connecter(email, "Temporaire9x");

        // Toute autre route est refusée tant que le mot de passe temporaire est actif
        mockMvc.perform(get("/api/salaries").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("MOT_DE_PASSE_A_CHANGER"));

        // Mot de passe trop faible refusé
        mockMvc.perform(post("/api/compte/mot-de-passe")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("motDePasseActuel", "Temporaire9x", "nouveauMotDePasse", "court"))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/compte/mot-de-passe")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("motDePasseActuel", "Temporaire9x", "nouveauMotDePasse", "NouveauSecret42"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(false));

        mockMvc.perform(get("/api/salaries").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void onlyAdminCanInviteResponsables() throws Exception {
        String email = "resp-" + UUID.randomUUID() + "@example.com";
        creerCompte(email, "Secret1234", UserRole.RESPONSABLE, false);
        String token = connecter(email, "Secret1234");

        mockMvc.perform(post("/api/responsables/invitations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Nouveau", "lastName", "Responsable", "email", "nouveau@example.com"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminInvitationCreatesAccountWithTemporaryPassword() throws Exception {
        String adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        creerCompte(adminEmail, "AdminSecret1", UserRole.ADMIN_RH, false);
        String token = connecter(adminEmail, "AdminSecret1");
        String email = "invite-" + UUID.randomUUID() + "@example.com";

        mockMvc.perform(post("/api/responsables/invitations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Nadia", "lastName", "Alami", "email", email))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statut").value("CREE"));

        User compte = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(compte.isMustChangePassword());
        org.junit.jupiter.api.Assertions.assertEquals(UserRole.RESPONSABLE, compte.getRole());

        // Une deuxième invitation sur la même adresse est refusée
        mockMvc.perform(post("/api/responsables/invitations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Nadia", "lastName", "Alami", "email", email))))
                .andExpect(status().isConflict());
    }

    @Test
    void passwordResetDoesNotRevealAccountsAndRejectsInvalidTokens() throws Exception {
        mockMvc.perform(post("/api/auth/mot-de-passe-oublie")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "inconnu@example.com"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/reinitialiser-mot-de-passe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", "jeton-invalide", "nouveauMotDePasse", "NouveauSecret42"))))
                .andExpect(status().isBadRequest());
    }
}
