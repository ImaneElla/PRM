package com.premium.essai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.premium.essai.dto.LoginRequest;
import com.premium.essai.model.Direction;
import com.premium.essai.model.Responsable;
import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.repository.DirectionRepository;
import com.premium.essai.repository.ResponsableRepository;
import com.premium.essai.repository.UserRepository;
import com.premium.essai.service.TableurExcel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Les vraies routes d'import Excel, appelées comme le fait le frontend (multipart, connecté en Admin RH)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ImportExcelApiTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DirectionRepository directionRepository;
    @Autowired private ResponsableRepository responsableRepository;

    @MockBean private JavaMailSender mailSender;

    private String admin;

    @BeforeEach
    void init() throws Exception {
        when(mailSender.createMimeMessage()).thenThrow(new org.springframework.mail.MailSendException("SMTP désactivé"));
        Direction direction = directionRepository.save(Direction.builder().code("DIR-A").name("Direction API").build());
        responsableRepository.save(Responsable.builder().firstName("Karim").lastName("Bennani")
                .email("karim.bennani@example.com").poste("Manager").direction(direction).build());
        String email = "admin-" + UUID.randomUUID() + "@example.com";
        userRepository.save(User.builder().nom("Test").prenom("Admin").email(email)
                .password(passwordEncoder.encode("Secret1234")).role(UserRole.ADMIN_RH).build());
        String body = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder().email(email).password("Secret1234").build())))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        admin = "Bearer " + json.get("token").asText();
    }

    @Test
    void importExcelDesResponsablesParLaVraieRoute() throws Exception {
        MockMultipartFile fichier = new MockMultipartFile("fichier", "modele-import-responsables.xlsx",
                TableurExcel.TYPE_XLSX, TableurExcel.modeleResponsables());

        mockMvc.perform(multipart("/api/responsables/invitations/import").file(fichier).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].statut").value("CREE"))
                .andExpect(jsonPath("$[0].email").value("marie.dupont@exemple.com"));
    }

    @Test
    void importExcelDesSalariesParLaVraieRoute() throws Exception {
        MockMultipartFile fichier = new MockMultipartFile("fichier", "salaries.csv",
                "text/csv", "nom;prénom;email;poste;date d'embauche\nAlaoui;Sara;sara.alaoui@exemple.com;Comptable;2026-10-01\n".getBytes(java.nio.charset.StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/salaries/import").file(fichier).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].statut").value("CREE"))
                .andExpect(jsonPath("$[0].matricule").value(org.hamcrest.Matchers.startsWith("GRP")));
    }

    @Test
    void lesModelesSeTelechargentEnExcel() throws Exception {
        for (String chemin : new String[]{"/api/salaries/modele-import", "/api/responsables/modele-import"}) {
            mockMvc.perform(get(chemin).header("Authorization", admin))
                    .andExpect(status().isOk())
                    .andExpect(content().contentTypeCompatibleWith(TableurExcel.TYPE_XLSX))
                    .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString(".xlsx")))
                    // Le fichier n'est pas vide : un vrai classeur Excel (archive ZIP « PK ») de plusieurs ko
                    .andExpect(result -> {
                        byte[] octets = result.getResponse().getContentAsByteArray();
                        org.junit.jupiter.api.Assertions.assertTrue(octets.length > 2000, "fichier trop petit : " + octets.length);
                        org.junit.jupiter.api.Assertions.assertEquals('P', octets[0]);
                        org.junit.jupiter.api.Assertions.assertEquals('K', octets[1]);
                    });
        }
    }

    @Test
    void unFichierQuiNEstPasUnExcelDonneUneErreurClaire400() throws Exception {
        MockMultipartFile faux = new MockMultipartFile("fichier", "faux.xlsx", TableurExcel.TYPE_XLSX, "pas un classeur".getBytes());

        mockMvc.perform(multipart("/api/responsables/invitations/import").file(faux).header("Authorization", admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Excel illisible")));
    }
}
