# Salle d’examen certifiante sécurisée

## Parcours retenu

1. **Éligibilité pédagogique** : 100 % des leçons et cas pratiques terminés, tous les quiz obligatoires réussis.
2. **Planification** : créneau demandé au moins 7 jours avant, capacité limitée à 10 candidats.
3. **Approbation** : l’administration accepte la demande et génère un code de salle individuel.
4. **Identité** : document officiel valide, données concordantes avec le profil, selfie en direct, score minimal de 85 % et révision humaine.
5. **Précontrôle technique** : caméra, microphone, écran complet partagé et plein écran.
6. **Activation** : l’examinateur ouvre la salle uniquement à l’heure prévue.
7. **Composition** : journal horodaté des sorties d’onglet, pertes de focus, sorties plein écran et interruptions de flux.
8. **Décision** : deux incidents critiques verrouillent la composition en attendant une révision humaine. Le journal accompagne l’appréciation finale.

## Ce que le mode local garantit

- Les règles de parcours et d’accès sont appliquées dans l’interface.
- Les permissions réelles du navigateur sont demandées.
- Les documents et selfies sont conservés dans IndexedDB, sur l’appareil courant.
- Les réservations, décisions, états de salle et incidents sont conservés dans le stockage local.
- Une URL directe d’examen ne contourne plus la salle sécurisée.

Le mode local ne constitue pas une preuve infalsifiable et ne transmet pas les flux à un autre ordinateur.

## Architecture de production prévue

- **Supabase/PostgreSQL** : profils, éligibilités, créneaux, réservations, décisions, incidents et piste d’audit en écriture seule.
- **Stockage privé** : documents et preuves chiffrés, URLs temporaires, politique de rétention et suppression automatique.
- **Prestataire KYC** : contrôle documentaire, extraction de données, selfie/liveness et verdict de correspondance. L’adaptateur ne doit jamais fabriquer un score absent du prestataire.
- **SFU WebRTC** : publication de deux pistes vidéo par candidat (visage et écran), cockpit examinateur limité à 10 candidats, signalisation authentifiée et reconnexion.
- **Moteur de risque** : événements signés côté serveur, règles explicables, pause/verrouillage gradués et revue humaine avant sanction définitive.
- **Sécurité** : consentement explicite, contrôle d’accès par rôle, journal des consultations de preuves, durée de conservation documentée et procédure d’appel.

## États essentiels

`eligible → requested → approved → identity_pending → identity_verified → technical_ready → room_active → admitted → submitted | locked → reviewed`

Le certificat ne doit être généré qu’après `submitted`, réussite académique et validation finale de l’intégrité de la session.
