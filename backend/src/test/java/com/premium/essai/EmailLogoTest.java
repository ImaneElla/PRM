package com.premium.essai;

import com.premium.essai.model.User;
import com.premium.essai.model.enums.UserRole;
import com.premium.essai.service.MailService;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Chaque e-mail part avec le logo du groupe (image incluse) et l'adresse du site
@SpringBootTest(properties = "application.mail-sender=rh@example.com")
@ActiveProfiles("test")
class EmailLogoTest {

    @Autowired private MailService mailService;
    @MockBean private JavaMailSender mailSender;

    @Test
    void chaqueEmailContientLeLogoEtLeSiteDuGroupe() throws Exception {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        User admin = User.builder().prenom("Imane").nom("Test").email("admin-logo@example.com")
                .role(UserRole.ADMIN_RH).build();

        mailService.sendInvitationAdmin(admin, "jeton-test");

        ArgumentCaptor<MimeMessage> envoye = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(envoye.capture());
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        envoye.getValue().writeTo(sortie);
        String brut = sortie.toString(StandardCharsets.ISO_8859_1);

        assertTrue(brut.contains("cid:logoGroupePremium"), "logo référencé dans la version HTML");
        assertTrue(brut.contains("Content-ID: <logoGroupePremium>"), "image du logo jointe au message");
        assertTrue(brut.contains("image/png"), "logo au format PNG");
        assertTrue(brut.contains("www.groupe-premium.com"), "site du groupe en pied de page");
        assertTrue(brut.contains("text/html"), "version HTML présente");
    }
}
