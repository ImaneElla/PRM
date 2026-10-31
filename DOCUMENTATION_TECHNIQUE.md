# Documentation technique

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?logo=springboot&logoColor=white)
![Java 17](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![Hibernate](https://img.shields.io/badge/Hibernate-59666C?logo=hibernate&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?logo=springsecurity&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white)
![Maven](https://img.shields.io/badge/Maven-C71A36?logo=apachemaven&logoColor=white)
![Flyway](https://img.shields.io/badge/Flyway-CC0200?logo=flyway&logoColor=white)
![Gmail SMTP](https://img.shields.io/badge/Gmail_SMTP-EA4335?logo=gmail&logoColor=white)
![Apache POI](https://img.shields.io/badge/Apache_POI-D22128?logo=apache&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?logo=swagger&logoColor=black)
![JUnit 5](https://img.shields.io/badge/JUnit_5-25A162?logo=junit5&logoColor=white)
![H2](https://img.shields.io/badge/H2-1021FF?logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-000000?logo=ollama&logoColor=white)
![Llama 3.2](https://img.shields.io/badge/Llama_3.2-0467DF?logo=meta&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white)
![VS Code](https://img.shields.io/badge/VS_Code-007ACC?logo=visualstudiocode&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white)
![PowerShell](https://img.shields.io/badge/PowerShell-5391FE?logo=powershell&logoColor=white)

Documentation technique de **Premium Ressources Humaines Manager**, l'application de suivi RH des périodes d'essai du Groupe Premium.

## Sommaire

1. [Objectif et périmètre](#1-objectif-et-périmètre)
2. [Stack et structure](#2-stack-et-structure)
3. [Parcours du salarié et des évaluations](#3-parcours-du-salarié-et-des-évaluations)
4. [Notifications RH et e-mails](#4-notifications-rh-et-e-mails)
5. [Échéances automatisées](#5-échéances-automatisées)
6. [API utilisées par l'interface](#6-api-utilisées-par-linterface)
7. [Configuration locale](#7-configuration-locale)
8. [Tests et contrôles](#8-tests-et-contrôles)
9. [Sécurité et déploiement](#9-sécurité-et-déploiement)
10. [Mode démo et limites de persistance](#10-mode-démo-et-limites-de-persistance)

## 1. Objectif et périmètre

**Premium Ressources Humaines Manager** accompagne le suivi RH des périodes d'essai. Le frontend est une application Next.js ; l'API métier est un service Spring Boot qui utilise PostgreSQL avec Spring Data JPA.

Les flux salariés, évaluations et notifications documentés ci-dessous sont reliés au backend. L'application contient également des vues de démonstration et des données conservées uniquement dans le navigateur.

> [!NOTE]
> Le stockage `localStorage` ne remplace pas PostgreSQL. Il n'est ni partagé entre utilisateurs ni synchronisé automatiquement avec le serveur.

## 2. Stack et structure

```mermaid
flowchart LR
    U([Utilisateur]) --> F[Frontend<br/>Next.js · React · TypeScript]
    F -->|services HTTP| A[API REST<br/>Spring Boot 3 · /api]
    A --> S[Services métier<br/>transactions JPA]
    S --> R[Repositories<br/>Spring Data]
    R --> D[(PostgreSQL)]
    S -.->|SMTP| M[Serveur e-mail]

    style U fill:#f3e8ff,stroke:#a855f7,color:#111
    style F fill:#cffafe,stroke:#06b6d4,color:#111
    style A fill:#dcfce7,stroke:#22c55e,color:#111
    style S fill:#dcfce7,stroke:#22c55e,color:#111
    style R fill:#dcfce7,stroke:#22c55e,color:#111
    style D fill:#dbeafe,stroke:#3b82f6,color:#111
    style M fill:#fef3c7,stroke:#f59e0b,color:#111
```

| Composant | Emplacement | Technologie / rôle |
| --- | --- | --- |
| Interface web | `frontend/src/app/`, `frontend/src/components/` | Next.js App Router, React, TypeScript |
| État partagé | `frontend/src/context/AppContext.tsx` | React Context ; données UI, appels API et mode démo |
| Services frontend | `frontend/src/services/` | Clients HTTP pour salariés, évaluations, notifications et dashboard |
| API REST | `backend/src/main/java/com/premium/essai/controller/` | Spring Boot 3, contexte `/api` |
| Logique métier | `backend/src/main/java/com/premium/essai/service/` | Services Spring et transactions JPA |
| Modèle et persistance | `backend/src/main/java/com/premium/essai/model/`, `repository/` | Entités JPA et repositories Spring Data |
| Base de données | `backend/src/main/resources/application.yaml` | PostgreSQL pour l'exécution locale |
| Tests backend | `backend/src/test/` | JUnit, Spring Boot Test et H2 |

Versions : Java 17 (`backend/pom.xml`) ; Bun, Next.js 16, React 19 et TypeScript 5 (`frontend/package.json`).

## 3. Parcours du salarié et des évaluations

### 3.1 Création du salarié et période 1

Le formulaire d'ajout appelle `salarieService.createSalarie()`, qui envoie un `POST /api/salaries` au backend.

Le service `SalarieServiceImpl` :

1. vérifie et associe la direction et le responsable ;
2. crée le salarié actif avec le statut `EN_COURS` ;
3. calcule la date de fin prévisionnelle à six mois ;
4. crée la période 1 (`TROIS_MOIS`, numéro `1`) avec une échéance à trois mois après l'embauche ;
5. renvoie les identifiants du salarié et de la période initiale au frontend.

Le frontend remplace les identifiants provisoires de son état par les identifiants générés par PostgreSQL. Cela permet au formulaire d'évaluation d'utiliser l'identifiant de période attendu par l'API.

### 3.2 Soumission par le responsable

Dans `FormulaireEvaluationScreen`, le bouton de soumission reste désactivé tant que le responsable n'a pas choisi l'une des recommandations suivantes :

| Choix dans l'interface | Valeur transmise à l'API |
| --- | --- |
| Renouvellement | `PROLONGATION_ESSAI` |
| Titularisation | `CONFIRMATION_CDI` |
| Arrêt de contrat | `RUPTURE_CONTRAT` |

Le choix est la recommandation du responsable, pas une décision de validation RH. Le backend valide les notes (de 1 à 5), enregistre les notes, les commentaires et les réponses détaillées en JSON, puis passe la période évaluée au statut `COMPLETEE`. Une seconde soumission pour la même période est refusée.

> [!IMPORTANT]
> Si l'API renvoie une erreur ou ne répond pas, le frontend affiche l'erreur et ne présente pas l'écran de confirmation. Le succès n'est affiché qu'après la réponse positive du backend.

```mermaid
sequenceDiagram
    autonumber
    actor R as Responsable
    participant F as Frontend
    participant A as API Spring Boot
    participant DB as PostgreSQL
    participant M as SMTP

    R->>F: Remplit le formulaire et choisit une recommandation
    F->>A: POST /api/evaluations/{periodeId}/soumettre
    A->>A: Valide les notes (1 à 5)
    A->>DB: Enregistre l'évaluation, période = COMPLETEE
    A->>DB: Crée la notification ALL_RH
    A-->>M: E-mail de confirmation (copie RH)
    A-->>F: Réponse positive
    F-->>R: Écran de confirmation
```

### 3.3 Suite du cycle

```mermaid
flowchart TD
    S[Soumission de l'évaluation] --> C{Recommandation}
    C -->|CONFIRMATION_CDI<br/>PROLONGATION_ESSAI| P2[Création de la période 2<br/>SIX_MOIS, numéro 2<br/>échéance à 6 mois]
    C -->|RUPTURE_CONTRAT| RU[Salarié en statut RUPTURE<br/>inactif, e-mails bloqués]
    P2 --> L[Identifiant et échéance renvoyés<br/>au frontend, ajoutés à la liste]

    style S fill:#dbeafe,stroke:#3b82f6,color:#111
    style C fill:#fef3c7,stroke:#f59e0b,color:#111
    style P2 fill:#dcfce7,stroke:#22c55e,color:#111
    style L fill:#dcfce7,stroke:#22c55e,color:#111
    style RU fill:#fee2e2,stroke:#ef4444,color:#111
```

- Pour `CONFIRMATION_CDI` et `PROLONGATION_ESSAI` sur une période de trois mois, `EvaluationServiceImpl` crée la période 2 (`SIX_MOIS`, numéro `2`) avec une échéance à six mois après la date d'embauche.
- Pour une recommandation de rupture, le salarié passe à l'état `RUPTURE`, devient inactif et ses e-mails sont bloqués.
- Une décision RH finale est un processus distinct de la recommandation du responsable.

## 4. Notifications RH et e-mails

À la soumission d'une évaluation, le backend crée une notification persistée avec la cible `ALL_RH`. Le frontend la charge depuis l'API et la présente dans le centre de notifications. Les actions « marquer comme lue » et « tout marquer comme lu » sont également envoyées à l'API.

| Méthode | Endpoint | Rôle |
| --- | --- | --- |
| `GET` | `/api/notifications` | Lire les notifications destinées à la RH |
| `PATCH` | `/api/notifications/{id}/read` | Marquer une notification comme lue |
| `PATCH` | `/api/notifications/read-all` | Marquer les notifications RH comme lues |

Après la soumission, un e-mail de confirmation est envoyé au responsable avec une copie à l'adresse RH configurée.

> [!NOTE]
> L'échec SMTP est journalisé ; il ne signifie pas que la notification en base n'a pas été créée. Il faut configurer `MAIL_USERNAME` et `MAIL_PASSWORD` pour que l'envoi d'e-mails fonctionne.

## 5. Échéances automatisées

`NotificationEcheanceService` exécute le traitement planifié du lundi au vendredi à 09:00, fuseau `Africa/Casablanca`. Le traitement ignore les week-ends et les jours fériés marocains prévus dans le service.

```mermaid
flowchart LR
    A[J-21<br/>rappel initial] --> B[J-14<br/>deuxième rappel]
    B --> C[J-7<br/>rappel urgent<br/>copie RH + notification]
    C --> D[Échéance dépassée<br/>EN_ATTENTE_DECISION_RH<br/>e-mails bloqués + alerte]

    style A fill:#dbeafe,stroke:#3b82f6,color:#111
    style B fill:#fef3c7,stroke:#f59e0b,color:#111
    style C fill:#ffedd5,stroke:#f97316,color:#111
    style D fill:#fee2e2,stroke:#ef4444,color:#111
```

| Étape | Action |
| --- | --- |
| J-21 | Rappel initial |
| J-14 | Deuxième rappel |
| J-7 | Rappel urgent, copie à la RH et notification dans l'application |
| Après l'échéance | Le dossier passe en `EN_ATTENTE_DECISION_RH`, le salarié est bloqué pour les e-mails et une alerte est créée |

Le formulaire du responsable refuse la soumission lorsque l'échéance est dépassée ou que la période est déjà en attente d'une décision RH. La régularisation doit alors suivre le circuit RH.

## 6. API utilisées par l'interface

Le frontend utilise par défaut `http://localhost:8080/api`. La variable `NEXT_PUBLIC_API_URL` peut définir une autre URL pour les services frontend qui la prennent en charge.

| Méthode | Endpoint | Utilisation |
| --- | --- | --- |
| `GET` / `POST` | `/api/salaries` | Charger les salariés actifs / créer un salarié et sa période 1 |
| `POST` | `/api/evaluations/{periodeId}/soumettre` | Enregistrer une évaluation et déclencher le flux de notification / période suivante |
| `GET` | `/api/evaluations/access/{token}` | Accès sécurisé au formulaire par jeton |
| `GET` | `/api/evaluations/periode/{periodeId}` | Lire le détail d'une évaluation |
| `GET` | `/api/notifications` | Charger les notifications RH |
| `PATCH` | `/api/notifications/{id}/read` | Marquer une notification comme lue |
| `PATCH` | `/api/notifications/read-all` | Marquer toutes les notifications RH comme lues |
| `GET` | `/api/dashboard/stats` | Charger les statistiques du tableau de bord |
| `GET` | `/api/dashboard/audit-emails` | Charger l'historique des e-mails |

> [!NOTE]
> Les routes Next.js présentes dans `frontend/src/app/api/` ne remplacent pas toutes ces routes métier. Certaines sont encore des points de terminaison de démonstration ; vérifier les services frontend avant d'utiliser une ressource en production.

## 7. Configuration locale

### PostgreSQL

Créer une base appelée `premium_essai_db`, puis vérifier la section `spring.datasource` dans `backend/src/main/resources/application.yaml`. La configuration actuelle vise `localhost:5432`. Les paramètres d'accès PostgreSQL sont définis dans ce fichier ; les variables `DB_URL`, `DB_USERNAME` et `DB_PASSWORD` d'un fichier `.env` ne sont pas utilisées par cette configuration actuelle.

> [!WARNING]
> Ne publiez aucun mot de passe ni secret. `backend/.env` est une configuration locale et ne doit pas être copiée dans la documentation.

### SMTP

Le backend lit les identifiants mail depuis `MAIL_USERNAME` et `MAIL_PASSWORD`. Le serveur SMTP est configuré dans `application.yaml`.

### Frontend

Les services frontend utilisent `NEXT_PUBLIC_API_URL` ou, si elle n'est pas définie, `http://localhost:8080/api`. Pour le développement local, le backend autorise les origines `http://localhost:3000` et `http://127.0.0.1:3000` par CORS.

### Démarrage sous Windows / PowerShell

Depuis la racine du dépôt, lancer le backend :

```powershell
Set-Location backend
.\mvnw.cmd spring-boot:run
```

Dans un second terminal, lancer le frontend :

```powershell
Set-Location frontend
bun install
bun run dev
```

| Service | Adresse locale |
| --- | --- |
| Application | `http://localhost:3000` |
| API | `http://localhost:8080/api` |
| Swagger UI | `http://localhost:8080/swagger-ui/index.html` |

Si Spring Boot signale que le port 8080 est déjà utilisé, identifier le processus à l'écoute avant d'agir, ou choisir un autre `server.port`.

## 8. Tests et contrôles

Tests backend :

```powershell
Set-Location backend
.\mvnw.cmd test
```

Vérification des types frontend :

```powershell
Set-Location frontend
bunx tsc --noEmit
```

Les tests backend utilisent H2 en mémoire via `backend/src/test/resources/application-test.yaml` ; ils ne nécessitent pas de connexion à PostgreSQL.

## 9. Sécurité et déploiement

> [!WARNING]
> La configuration actuelle de Spring Security autorise les requêtes sans authentification et le sélecteur de rôle frontend ne protège pas les données. La configuration CORS est limitée aux origines locales. Cette application ne doit pas être exposée avec des données RH réelles avant la mise en place d'une authentification, d'autorisations côté serveur, de secrets fournis par l'environnement et d'origines CORS de production explicitement approuvées.

Le frontend peut être hébergé séparément, mais une URL `localhost` ne fonctionnera pas pour les utilisateurs d'un site public. Déployer également l'API et configurer `NEXT_PUBLIC_API_URL`, PostgreSQL, SMTP et CORS pour les domaines réels.

## 10. Mode démo et limites de persistance

Le mode démo s'appuie sur les jeux de données définis dans `frontend/src/data/mockData.ts`. Certaines données et préférences UI sont conservées dans `localStorage`. Elles restent dans le navigateur local et ne sont pas visibles par les autres utilisateurs.

Pour les parcours branchés au backend, les données serveur font foi. En mode démo, les données d'exemple ne doivent pas être interprétées comme des enregistrements PostgreSQL.

> [!TIP]
> Pour toute nouvelle fonctionnalité, vérifier qu'elle possède un endpoint Spring Boot, un service frontend qui appelle cet endpoint et un test couvrant la persistance attendue.
