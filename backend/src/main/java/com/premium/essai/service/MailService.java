package com.premium.essai.service;

import com.premium.essai.model.PeriodeEvaluation;
import com.premium.essai.model.User;

public interface MailService {
    boolean sendRappelJ21(PeriodeEvaluation periode);
    boolean sendRappelJ14(PeriodeEvaluation periode);
    boolean sendRappelJ7(PeriodeEvaluation periode);
    void sendAlerteRetard(PeriodeEvaluation periode, int joursRetard);
    void sendNotificationFormulaireRempliAuxAdmins(PeriodeEvaluation periode);
    void sendConfirmationRH(PeriodeEvaluation periode, String decision);
    boolean sendInvitationResponsable(User user, String motDePasseTemporaire);
    boolean sendReinitialisationMotDePasse(User user, String jeton);
    boolean sendInvitationAdmin(User user, String jeton);
}
