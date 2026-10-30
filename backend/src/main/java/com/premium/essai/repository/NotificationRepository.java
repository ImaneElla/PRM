package com.premium.essai.repository;

import com.premium.essai.model.Notification;
import com.premium.essai.model.enums.CibleRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByCibleRoleAndEstLueFalse(CibleRole cibleRole);
    List<Notification> findByTargetId(Long targetId);
    List<Notification> findByTargetIdIsNullAndTitreIn(Collection<String> titres);
    List<Notification> findByCibleRoleAndEstLueFalseOrderByDateCreationDesc(CibleRole cibleRole);
    List<Notification> findByCibleRoleOrderByDateCreationDesc(CibleRole cibleRole);
}
