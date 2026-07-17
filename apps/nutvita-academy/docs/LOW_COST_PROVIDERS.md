# Fournisseurs à faible coût retenus

## Architecture recommandée

| Besoin                             | Choix principal                     | Coût cible                                                                               | Limite importante                                                                        |
| ---------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Contrôle d’identité                | Didit Identity Verification         | Gratuit jusqu’à 500 vérifications mensuelles par fonctionnalité, puis paiement à l’usage | Nécessite un compte, un workflow et un webhook Didit                                     |
| Visioconférence et partage d’écran | Jitsi Meet                          | Gratuit et open source                                                                   | L’instance publique ne fournit pas de SLA ; auto-héberger lorsque le volume l’exige      |
| Surveillance automatisée           | Moteur NutVita + examinateur humain | Pas de licence externe                                                                   | Les signaux navigateur ne remplacent pas une décision humaine en cas de fraude contestée |
| Solution vidéo de secours          | Daily Video SDK                     | Palier gratuit mensuel, puis paiement à l’usage                                          | À activer uniquement si Jitsi ne satisfait plus les contraintes de qualité               |

Un abonnement commercial complet de contrôle d’identité, visioconférence et
surveillance d’examen à 25 USD par an n’est pas réaliste. L’assemblage ci-dessus
reste néanmoins à 0 USD tant que l’usage demeure dans les paliers gratuits et
que Jitsi est utilisé sans infrastructure payante.

## Configuration lors de la migration Supabase

1. Appliquer `supabase/migrations/007_ai_identity_proctoring.sql`.
2. Créer un workflow Didit avec document, vivacité et comparaison faciale.
3. Définir `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID` et `DIDIT_WEBHOOK_SECRET`.
4. Déclarer `/api/proctoring/identity/didit-webhook` comme webhook Didit.
5. Définir `PROCTORING_IDENTITY_PROVIDER=didit`.
6. Vérifier `/api/proctoring/readiness` avant d’ouvrir une session d’examen.

Les tarifs et quotas doivent être vérifiés sur les pages officielles au moment
de l’activation, car les fournisseurs peuvent les modifier.
