package com.premium.essai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.MailService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private MailService mailService;

    private User creerCompte(String email, String password, UserRole role) {
        return userRepository.save(User.builder()
                .nom("Test")
                .prenom("User")
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(role)
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

    private String email(String prefixe) {
        return prefixe + "-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    void invitedAdminActivatesAccountWithSingleUseLink() throws Exception {
        when(mailService.sendInvitationAdmin(any(), any())).thenReturn(true);
        String adminEmail = email("admin");
        creerCompte(adminEmail, "AdminSecret1", UserRole.ADMIN_RH);
        String token = connecter(adminEmail, "AdminSecret1");
        String inviteEmail = email("nouvel-admin");

        mockMvc.perform(post("/api/admins/invitations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "prenom", "Sara", "nom", "Alaoui", "email", inviteEmail))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statut").value("INVITE"))
                .andExpect(jsonPath("$.emailEnvoye").value(true))
                // Le lien n'est jamais renvoyé à l'API quand l'e-mail est parti
                .andExpect(jsonPath("$.lienActivation").doesNotExist());

        ArgumentCaptor<String> jeton = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendInvitationAdmin(any(User.class), jeton.capture());
        assertNotNull(jeton.getValue());

        // La base ne contient que l'empreinte du jeton, jamais le jeton lui-même
        User invite = userRepository.findByEmailIgnoreCase(inviteEmail).orElseThrow();
        assertEquals(UserRole.ADMIN_RH, invite.getRole());
        assertTrue(invite.isMustChangePassword());
        assertFalse(jeton.getValue().equals(invite.getResetTokenHash()));

        // Activation : l'invité choisit son mot de passe
        mockMvc.perform(post("/api/auth/reinitialiser-mot-de-passe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", jeton.getValue(), "nouveauMotDePasse", "MonSecret2026"))))
                .andExpect(status().isOk());

        // Le lien ne sert qu'une fois
        mockMvc.perform(post("/api/auth/reinitialiser-mot-de-passe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", jeton.getValue(), "nouveauMotDePasse", "AutreSecret2026"))))
                .andExpect(status().isBadRequest());

        // Il peut maintenant se connecter et gérer les admins
        String tokenInvite = connecter(inviteEmail, "MonSecret2026");
        mockMvc.perform(get("/api/admins").header("Authorization", "Bearer " + tokenInvite))
                .andExpect(status().isOk());
    }

    @Test
    void nonAdminCannotManageAdmins() throws Exception {
        String email = email("resp");
        creerCompte(email, "Secret1234", UserRole.RESPONSABLE);
        String token = connecter(email, "Secret1234");

        mockMvc.perform(get("/api/admins").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admins/invitations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "prenom", "Pirate", "nom", "Test", "email", email("pirate")))))
                .andExpect(status().isForbidden());
    }

    @Test
    void invitationRefusesExistingEmail() throws Exception {
        String adminEmail = email("admin");
        creerCompte(adminEmail, "AdminSecret1", UserRole.ADMIN_RH);
        String token = connecter(adminEmail, "AdminSecret1");

        mockMvc.perform(post("/api/admins/invitations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "prenom", "Doublon", "nom", "Test", "email", adminEmail.toUpperCase()))))
                .andExpect(status().isConflict());
    }

    @Test
    void deactivatedAdminLosesAccessImmediately() throws Exception {
        String emailA = email("admin-a");
        String emailB = email("admin-b");
        creerCompte(emailA, "AdminSecret1", UserRole.ADMIN_RH);
        User b = creerCompte(emailB, "AdminSecret2", UserRole.ADMIN_RH);
        String tokenA = connecter(emailA, "AdminSecret1");
        String tokenB = connecter(emailB, "AdminSecret2");

        mockMvc.perform(post("/api/admins/" + b.getId() + "/desactivation")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("DESACTIVE"));

        // Son jeton encore valide n'ouvre plus rien
        mockMvc.perform(get("/api/admins").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().is4xxClientError());

        // Et il ne peut plus se reconnecter
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(emailB).password("AdminSecret2").build())))
                .andExpect(status().isUnauthorized());

        // Réactivation
        mockMvc.perform(post("/api/admins/" + b.getId() + "/reactivation")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("ACTIF"));
        connecter(emailB, "AdminSecret2");
    }

    @Test
    void adminCannotDeactivateOwnAccount() throws Exception {
        String adminEmail = email("admin");
        User admin = creerCompte(adminEmail, "AdminSecret1", UserRole.ADMIN_RH);
        String token = connecter(adminEmail, "AdminSecret1");

        mockMvc.perform(post("/api/admins/" + admin.getId() + "/desactivation")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
    }
}
