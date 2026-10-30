package com.premium.essai.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoriqueEmailResponseDTO {
    private Long id;
    private String salarieNom;
    private String destinataire;
    private String destinataireNom;
    private String roleDestinataire;
    private String objet;
    private String typeEmail;
    private LocalDate dateEnvoi;
    private LocalTime heureEnvoi;
    private String statut;
    private boolean batchCron;
}