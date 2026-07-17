# Audit bilingue français / anglais

## Couverture officielle

Au 17 juillet 2026, l’audit statique strict signale **0 texte non localisé dans
0 fichier** sur le périmètre des interfaces `app/` et `components/`.

La couverture inclut notamment :

- le sélecteur de langue persistant français/anglais ;
- l’authentification et le choix d’espace selon le rôle ;
- la navigation et les parcours apprenant, formateur et administration ;
- le catalogue, la facturation, les classes virtuelles et les organisations ;
- les quiz, examens, certificats et interfaces de surveillance ;
- le Studio avec champs distincts français/anglais pour les formations,
  modules, leçons, vidéos, HTML interactif, ressources, quiz et examens finaux ;
- les messages des routes API contrôlées par `apiText()` ;
- les états vides, libellés d’accessibilité, confirmations et erreurs visibles.

## Contrôle automatisé

La commande suivante doit rester bloquante dans la validation continue :

```powershell
npm.cmd run i18n:audit
```

Le script `scripts/i18n-audit.mjs` analyse l’arbre TypeScript/TSX et détecte les
textes français bruts non reliés à `useLanguage()`, `LocalizedText` ou
`apiText()`. Il contrôle aussi les attributs visibles tels que les espaces
réservés et les libellés d’accessibilité. Les contenus Studio bilingues sont en
plus validés avant publication : les versions française et anglaise requises
doivent être renseignées.

## Règle de maintenance

Tout nouvel écran doit utiliser `LanguageProvider` et `useLanguage()` côté
client, `LocalizedText` côté serveur ou `apiText()` dans les routes API. Le
français reste la langue de repli et le choix de l’utilisateur est stocké dans
`nutvita-language`. Une régression de l’audit interdit de déclarer la version
prête à publier.
