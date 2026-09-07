# TELE LAB — Cahier des charges complet

## 1. Présentation du projet

**Tele Lab** est une plateforme de réparation de téléphones à domicile.

Le principe :

1. Le client arrive sur le site.
2. Il demande une réparation à domicile via un formulaire.
3. Il choisit le type de problème : Hardware ou Software.
4. Il renseigne son téléphone, le problème, ses coordonnées et son adresse.
5. La demande arrive dans le Back Office Admin.
6. L'équipe Tele Lab analyse la demande et contacte le client par téléphone.
7. Le prix de la réparation est communiqué et confirmé avec le client.
8. L'Admin confirme la demande dans le système.
9. Le client reçoit automatiquement un message WhatsApp avec un lien de suivi.
10. L'Admin assigne un livreur disponible.
11. Le livreur reçoit les informations de la mission via WhatsApp / Dashboard.
12. Le livreur récupère le téléphone chez le client.
13. Le client paie **30 % du prix de la réparation** au moment de la récupération.
14. Le téléphone est livré à la boutique Tele Lab.
15. Le statut devient « Reçu à la boutique ».
16. Le technicien effectue le diagnostic et la réparation.
17. Lorsque la réparation est terminée, le statut devient « Réparation terminée ».
18. Un livreur est assigné pour le retour.
19. Le téléphone est livré au client.
20. Le client paie les **70 % restants**.
21. Le statut devient « Reçu client ».
22. La facture et les informations de garantie sont disponibles.

La livraison est **gratuite** pour le client. Les 30 % et 70 % sont des paiements du prix de la réparation, et non des frais de livraison.

---

# 2. Objectifs

La plateforme doit :

- Simplifier la demande de réparation.
- Éviter les déplacements inutiles du client.
- Permettre à Tele Lab de gérer toutes les demandes depuis un Back Office.
- Permettre de gérer les livreurs.
- Permettre de suivre chaque téléphone avec un Tracking Number.
- Informer le client à chaque étape.
- Gérer les paiements 30 % / 70 %.
- Générer et conserver les factures.
- Gérer les informations de garantie.
- Conserver un historique complet de chaque réparation.
- Être rapide, moderne et responsive.
- Être disponible en **français et arabe**.

---

# 3. Stack technique

## Frontend

- React
- React Router
- JavaScript ou TypeScript
- UI responsive
- Light Mode

## Backend / Services

- Supabase
  - PostgreSQL Database
  - Authentication
  - Storage
  - Realtime
  - Row Level Security (RLS)

## Hosting

- Netlify

## Intégrations prévues

- WhatsApp
- Géolocalisation navigateur
- Google Maps / lien Maps
- Notifications
- Génération de facture PDF

---

# 4. Design System

## Style

Le site doit être :

- Moderne
- Propre
- Professionnel
- Rapide
- Mobile-first
- Orienté confiance
- Simple pour les utilisateurs non techniques

## Mode

**Light Mode uniquement**

## Couleurs principales

### Primary Blue

`#1677FF`

### Noir

`#000000`

### Blanc

`#FFFFFF`

Utiliser des gris très légers pour les backgrounds secondaires, bordures et éléments désactivés.

## Direction visuelle

- Cards avec coins arrondis.
- Boutons bleus avec texte blanc.
- Beaucoup d'espace blanc.
- Icônes simples.
- États visibles avec badges.
- Animations légères et rapides.
- Pas de design trop chargé.

---

# 5. Langues

Le site doit supporter :

- Français (`fr`)
- Arabe (`ar`)

L'arabe doit utiliser une vraie interface RTL :

- Direction `rtl`
- Alignements adaptés
- Navigation adaptée
- Formulaires adaptés

Le changement de langue doit être disponible dans le Header :

**FR | العربية**

Tous les textes doivent être centralisés dans un système de traduction afin d'éviter de coder les textes directement dans les composants.

---

# 6. HOME PAGE

La Home doit expliquer immédiatement :

- Ce que fait Tele Lab.
- Comment fonctionne la réparation à domicile.
- Que la livraison est gratuite.
- Comment fonctionne le paiement 30 % / 70 %.
- Comment suivre la réparation.
- Comment demander une réparation.

---

## Hero

Titre :

**Réparation de téléphone à domicile**

Texte :

> Votre téléphone est en panne ? Tele Lab vient le récupérer chez vous, le répare dans notre atelier et vous le ramène directement à domicile.

CTA principal :

**Réparer mon téléphone**

CTA secondaire :

**Suivre ma réparation**

---

# 7. Section « Comment ça marche ? »

## Étape 1 — Demandez une réparation

Le client remplit le formulaire en quelques étapes.

## Étape 2 — Confirmation

L'équipe Tele Lab contacte le client par téléphone pour comprendre le problème et confirmer le prix de la réparation.

## Étape 3 — Collecte à domicile

Un livreur Tele Lab vient récupérer le téléphone chez le client.

## Étape 4 — Réparation

Le téléphone arrive à la boutique Tele Lab pour diagnostic et réparation.

## Étape 5 — Retour

Une fois la réparation terminée, le téléphone est livré au client.

## Étape 6 — Paiement final

Le client règle les 70 % restants à la livraison.

---

# 8. Section « Livraison gratuite »

Texte :

> **Livraison gratuite**
>
> Pas de frais de livraison. Nous récupérons votre téléphone chez vous et nous vous le ramenons après réparation.

---

# 9. Section « Paiement »

Expliquer clairement :

### 30 % à la récupération

Le client paie 30 % du prix de la réparation lorsque le livreur récupère son téléphone.

### 70 % à la livraison

Le client paie les 70 % restants lorsque le téléphone réparé lui est livré.

### Exemple

Réparation : **180 DT**

- 30 % = **54 DT**
- 70 % = **126 DT**
- Total = **180 DT**

Le prix final est défini et confirmé avec le client **avant la collecte**.

---

# 10. Bouton « Réparation à domicile »

Lorsque le client clique sur :

**Réparer mon téléphone**

ouvrir un formulaire sous forme de :

- Modal / Popup
- Multi-step
- Progress bar
- Navigation Précédent / Suivant
- Validation de chaque étape

Progression :

**Appareil → Client → Adresse → Récapitulatif**

---

# 11. ÉTAPE 0 — Type de réparation

Le client choisit :

### Hardware

Problème matériel.

### Software

Problème logiciel.

Le choix doit être enregistré dans la demande.

---

# 12. ÉTAPE 1 — Téléphone

## Marque

Champ avec recherche/autocomplete.

Exemple :

Client écrit :

`APP`

Résultat :

**Apple**

Client écrit :

`SAM`

Résultat :

**Samsung**

La liste doit pouvoir contenir les marques de téléphones courantes.

---

## Modèle

Le modèle dépend automatiquement de la marque sélectionnée.

Exemple :

Marque : Apple

Résultats :

- iPhone 12
- iPhone 12 Pro
- iPhone 12 Pro Max
- iPhone 13
- iPhone 13 Pro
- iPhone 13 Pro Max
- iPhone 14
- iPhone 14 Pro
- iPhone 15
- iPhone 15 Pro
- iPhone 15 Pro Max

Le champ doit supporter la recherche.

Exemple :

`IPH 15`

→ iPhone 15  
→ iPhone 15 Plus  
→ iPhone 15 Pro  
→ iPhone 15 Pro Max

---

# 13. Problème

Liste avec recherche/autocomplete.

Exemples :

- Batterie
- Écran / Affichage
- Charge
- Tactile
- Carte mère
- Caméra
- Micro
- Haut-parleur
- Réseau
- Wi-Fi
- Bluetooth
- Bouton Power
- Boutons Volume
- Dégât liquide
- Software
- Autre

Possibilité d'ajouter un champ :

**Décrivez le problème**

---

# 14. Photos

Le client peut :

### 📷 Prendre une photo

Ouvrir la caméra du téléphone.

### 🖼️ Choisir depuis la galerie

Sélectionner une ou plusieurs photos.

Prévoir plusieurs photos pour aider le technicien à comprendre le problème.

Les fichiers doivent être stockés dans **Supabase Storage**.

---

# 15. ÉTAPE 2 — Client

Champs :

- Prénom
- Nom
- Numéro de téléphone

---

## Compte client

Question :

> Voulez-vous créer un compte ?

Options :

**Créer un compte**

ou

**Continuer sans compte**

Si le client crée un compte :

- Email ou identifiant selon architecture choisie
- Mot de passe
- Confirmation du mot de passe

Le compte permet ensuite d'accéder à un Dashboard Client avec l'historique des réparations.

Le client sans compte doit quand même pouvoir suivre sa demande avec :

- Tracking Number
- ou numéro de téléphone

---

# 16. ÉTAPE 3 — Adresse

Le système doit proposer :

### Localisation automatique

Bouton :

**📍 Utiliser ma position actuelle**

Le navigateur demande l'autorisation de géolocalisation.

Si la localisation automatique est refusée, afficher les champs manuels.

---

## Champs manuels

- Gouvernorat
- Ville / Délégation
- Localité / Zone
- Adresse
- Complément d'adresse

Optionnellement :

- Latitude
- Longitude
- Adresse Google Maps

---

# 17. ÉTAPE 4 — Récapitulatif

Avant l'envoi, afficher :

## Appareil

Marque + modèle

## Type

Hardware / Software

## Problème

Problème sélectionné

## Photos

Nombre de photos

## Client

Nom + téléphone

## Adresse

Adresse de récupération

---

## Information importante

Afficher :

> Le prix final est confirmé par Tele Lab après analyse de votre demande et échange téléphonique avec le client. Aucune réparation ne doit être considérée comme définitivement acceptée avant confirmation.

Puis :

**Envoyer ma demande**

---

# 18. Création de la demande

Après validation :

Créer automatiquement :

- ID interne
- Tracking Number unique
- Date
- Heure
- Client
- Appareil
- Problème
- Photos
- Adresse
- Type de réparation
- Statut initial

Statut initial :

**Demande reçue**

---

# 19. Tracking Number

Format recommandé :

`TL-2026-000184`

Le numéro doit être unique.

Afficher immédiatement au client :

> Votre demande a été envoyée avec succès.

> Notre équipe va vous contacter par téléphone pour confirmer votre demande et le prix.

Afficher :

**Tracking Number : TL-2026-000184**

CTA :

**Suivre ma réparation**

---

# 20. PAGE TRACKING

Route conceptuelle :

`/tracking`

Le client peut rechercher avec :

- Tracking Number
- Numéro de téléphone

Résultat :

## Exemple

**TL-2026-000184**

Apple — iPhone 13

Problème : Batterie

Prix : 180 DT

Acompte : 54 DT

Solde : 126 DT

---

# 21. Timeline Tracking

La timeline doit afficher toutes les étapes :

```text
✓ Demande envoyée
      ↓
✓ Prix confirmé
      ↓
✓ Demande confirmée
      ↓
○ Livreur assigné
      ↓
○ En cours de livraison — récupération
      ↓
○ Téléphone récupéré
      ↓
○ Reçu à la boutique
      ↓
○ En cours de réparation
      ↓
○ Réparation terminée
      ↓
○ En cours de livraison — retour
      ↓
○ Reçu par le client
```

Chaque changement de statut doit être enregistré dans l'historique.

---

# 22. Dashboard Client

Pour les clients qui créent un compte :

## Accueil

Bonjour [Prénom]

### Mes réparations

Chaque réparation apparaît dans une Card.

Exemple :

**TL-2026-000184**

iPhone 13

Batterie

🟢 En cours de réparation

**Voir le suivi**

---

## Détails disponibles

Le client peut voir :

- Tracking Number
- Téléphone
- Problème
- Photos
- Prix
- 30 %
- 70 %
- Paiements
- Statut
- Timeline
- Facture
- Garantie
- Historique

---

# 23. BACK OFFICE ADMIN

Le Back Office est réservé à Tele Lab.

Sidebar recommandée :

- Dashboard
- Demandes
- Clients
- Réparations
- Techniciens
- Livreurs
- Paiements
- Factures
- Garanties
- Pièces
- Notifications
- Paramètres

---

# 24. Dashboard Admin

Afficher des statistiques :

- Nouvelles demandes
- Demandes à confirmer
- Demandes confirmées
- Téléphones à récupérer
- Téléphones reçus à la boutique
- Réparations en cours
- Réparations terminées
- Livraisons à effectuer
- Demandes terminées

Exemple :

```text
Nouvelles demandes        12
À confirmer                7
Confirmées                 5
À récupérer                4
En réparation              8
Prêtes à livrer            3
Terminées                 12
```

---

# 25. Gestion des demandes

Admin peut :

- Voir toutes les demandes.
- Rechercher par Tracking Number.
- Rechercher par téléphone.
- Filtrer par statut.
- Filtrer par date.
- Filtrer par livreur.
- Filtrer par type Hardware / Software.
- Ouvrir une demande.

---

# 26. Détail d'une demande Admin

Afficher :

## Client

- Nom
- Téléphone
- Adresse
- Localisation

## Téléphone

- Marque
- Modèle
- Type
- Problème
- Description
- Photos

## Prix

Avant confirmation :

**Prix : à définir**

Après discussion avec le client :

**Prix réparation : 180 DT**

Calcul automatique :

**30 % = 54 DT**

**70 % = 126 DT**

---

# 27. Confirmation Admin

L'Admin contacte le client par téléphone.

Il explique :

- Le problème
- Le prix
- Le fonctionnement
- Les 30 %
- Les 70 %
- La récupération
- La réparation
- La livraison retour
- Garantie selon réparation

Si le client accepte :

Admin saisit / confirme le prix puis clique :

**✅ Confirmer la demande**

Le statut devient :

**Demande confirmée**

Le prix est alors enregistré dans le système.

---

# 28. WhatsApp Client

Après confirmation Admin, le système doit envoyer un message WhatsApp au numéro du client.

Contenu recommandé :

> Bonjour [Nom] 👋
>
> Votre demande de réparation **[Tracking Number]** a été confirmée par Tele Lab.
>
> 📱 Appareil : [Modèle]
>
> 🔧 Réparation : [Problème]
>
> 💰 Prix total : [Prix] DT
>
> 💳 À la récupération : [30 %] DT
>
> 💳 À la livraison : [70 %] DT
>
> 🚚 Livraison : Gratuite
>
> 🔎 Suivez votre réparation :
>
> [Tracking Link]

Le lien doit être unique pour la demande.

---

# 29. Tracking Link

Créer un lien sécurisé par demande.

Concept :

`https://telelab.tn/track/TL-2026-000184`

Éviter d'exposer des informations sensibles dans l'URL.

Le lien doit permettre au client de voir uniquement sa demande.

---

# 30. Gestion des livreurs

Admin possède une page :

**Gestion des livreurs**

Afficher :

- Nom
- Téléphone
- WhatsApp
- Zone
- Statut
- Missions en cours
- Actif / Inactif

---

# 31. Statuts livreur

Les statuts principaux :

### 🟢 Disponible

Le livreur peut recevoir une mission.

### 🔴 Occupé

Le livreur possède une mission active.

### ⚫ Hors service

Le livreur ne doit pas recevoir de mission.

---

# 32. Ajouter / supprimer un livreur

Admin peut :

**+ Ajouter un livreur**

Informations :

- Nom
- Prénom
- Téléphone
- WhatsApp
- Zone
- Statut

Admin peut également :

- Modifier
- Désactiver
- Réactiver
- Supprimer selon les règles de sécurité

Pour l'historique, privilégier la désactivation plutôt que la suppression définitive.

---

# 33. Assignation livreur

Après confirmation :

Admin clique :

**🚚 Assigner un livreur**

Popup :

> Sélectionner un livreur

Afficher uniquement ou prioritairement les livreurs disponibles.

Exemple :

```text
Ahmed       🟢 Disponible
Mohamed     🔴 Occupé
Yassine     🟢 Disponible
```

Admin sélectionne un livreur.

Puis :

**Confirmer**

---

# 34. Informations envoyées au livreur

Le livreur reçoit :

- Nom client
- Numéro client
- Localisation
- Adresse
- Téléphone à récupérer
- Marque
- Modèle
- Problème
- Montant à récupérer
- Tracking Number
- Instructions

---

# 35. WhatsApp Livreur

Après assignation, envoyer un message WhatsApp au livreur.

Exemple :

> Bonjour [Livreur] 👋
>
> Nouvelle mission Tele Lab.
>
> 📦 Mission : récupération
>
> 📱 Appareil : iPhone 13
>
> 🔧 Problème : Batterie
>
> 📞 Client : [Téléphone]
>
> 📍 Adresse : [Adresse]
>
> 💰 Montant à récupérer : 54 DT
>
> 🔎 Tracking : TL-2026-000184
>
> [Ouvrir la mission]

Le lien peut ouvrir le Dashboard Livreur.

---

# 36. Mission Livreur

Le livreur doit avoir un Dashboard simple.

Afficher :

- Missions disponibles
- Missions assignées
- Missions en cours
- Missions terminées

Pour une mission :

### Récupération

Boutons :

**📍 Ouvrir la localisation**

**📞 Appeler le client**

**💬 WhatsApp**

**📦 Téléphone récupéré**

---

# 37. Récupération

Quand le livreur récupère le téléphone :

Le système doit pouvoir enregistrer :

- Date
- Heure
- Livreur
- Mission
- Confirmation de récupération
- Montant 30 %
- Paiement reçu

Statut :

**Téléphone récupéré**

Paiement :

**30 % reçu**

---

# 38. Livraison à la boutique

Le livreur apporte le téléphone à Tele Lab.

Admin / réception :

**📦 Confirmer réception boutique**

Statut :

**Reçu à la boutique**

Enregistrer :

- Date
- Heure
- Livreur
- Boutique
- Tracking Number

---

# 39. Service technique

Le technicien ouvre la réparation.

Il voit :

- Client
- Appareil
- Problème déclaré
- Photos
- Prix confirmé
- Historique

---

# 40. Diagnostic technique

Technicien peut ajouter :

- Diagnostic
- Problème réel
- Pièce nécessaire
- Pièce utilisée
- Notes
- Photos après diagnostic
- Temps estimé
- Résultat

Important :

Si le diagnostic révèle un problème différent ou un coût supplémentaire, le système doit permettre de mettre la demande en attente de nouvelle confirmation client avant d'effectuer une intervention supplémentaire.

---

# 41. Réparation

Statut :

**En cours de réparation**

Le technicien travaille sur le téléphone.

Il peut ajouter des notes techniques.

---

# 42. Réparation terminée

Lorsque le technicien termine :

**✅ Réparation terminée**

Enregistrer :

- Date
- Heure
- Technicien
- Diagnostic final
- Réparation effectuée
- Pièces
- Prix final confirmé
- Garantie

---

# 43. Garantie

Chaque réparation peut avoir une garantie selon :

- Type de réparation
- Pièce
- Intervention
- Conditions Tele Lab

Afficher clairement au client :

**Garantie : [durée / conditions]**

Les conditions exactes doivent être configurables dans le Back Office.

---

# 44. Facture

Créer une facture associée à la réparation.

Informations :

- Tele Lab
- Numéro facture
- Tracking Number
- Client
- Téléphone
- Réparation
- Prix total
- 30 % payé
- 70 % restant
- Paiement final
- Garantie
- Date

La facture doit être accessible au client.

Possibilité :

**Télécharger PDF**

---

# 45. Livraison retour

Après réparation terminée :

Admin assigne un livreur disponible.

Le statut devient :

**En cours de livraison — retour**

Le livreur reçoit :

- Adresse client
- Téléphone
- Tracking
- Montant restant

---

# 46. Paiement final

Exemple :

Prix total :

**180 DT**

Acompte :

**54 DT — payé**

Solde :

**126 DT — à payer**

Au moment de la livraison :

**126 DT**

Le livreur / Admin confirme :

**✅ Paiement final reçu**

Le paiement devient :

**Payé**

---

# 47. Fin de la demande

Après remise du téléphone :

Statut final :

**Reçu par le client**

La demande est terminée.

Le système conserve tout l'historique.

---

# 48. Workflow officiel

Le workflow principal doit être :

```text
DEMANDE
    ↓
PRIX CONFIRMÉ
    ↓
CONFIRMÉE
    ↓
LIVREUR ASSIGNÉ
    ↓
EN COURS DE LIVRAISON — RÉCUPÉRATION
    ↓
TÉLÉPHONE RÉCUPÉRÉ
    ↓
REÇU À LA BOUTIQUE
    ↓
EN COURS DE RÉPARATION
    ↓
RÉPARATION TERMINÉE
    ↓
LIVREUR ASSIGNÉ — RETOUR
    ↓
EN COURS DE LIVRAISON — RETOUR
    ↓
REÇU CLIENT
```

---

# 49. Historique des statuts

Chaque changement doit être enregistré.

Exemple :

```text
05/09 14:32
Demande créée

05/09 15:10
Prix confirmé

05/09 15:15
Demande confirmée

05/09 16:20
Livreur assigné

05/09 17:05
Téléphone récupéré

05/09 18:00
Reçu à la boutique

06/09 09:15
Diagnostic commencé

06/09 11:30
En cours de réparation

06/09 14:20
Réparation terminée

06/09 16:00
En cours de livraison

06/09 17:10
Reçu par le client
```

Chaque événement doit contenir :

- status
- date
- heure
- utilisateur qui a effectué l'action
- commentaire éventuel

---

# 50. Supabase — Tables recommandées

## users

Gestion des comptes utilisateurs.

Champs possibles :

- id
- role
- name
- phone
- email
- created_at

Roles :

- customer
- admin
- technician
- driver

---

## customers

- id
- user_id
- first_name
- last_name
- phone
- created_at

---

## drivers

- id
- user_id
- first_name
- last_name
- phone
- whatsapp
- zone
- status
- active
- created_at

---

## technicians

- id
- user_id
- first_name
- last_name
- specialty
- active

---

## brands

- id
- name
- active

---

## models

- id
- brand_id
- name
- active

---

## repair_problems

- id
- name_fr
- name_ar
- type
- active

Types :

- hardware
- software
- both

---

## repair_requests

Table principale.

Champs possibles :

- id
- tracking_number
- customer_id
- brand_id
- model_id
- problem_id
- repair_type
- description
- status
- price
- deposit_amount
- remaining_amount
- payment_status
- driver_id
- technician_id
- created_at
- confirmed_at
- completed_at

---

## repair_photos

- id
- repair_request_id
- storage_path
- uploaded_at

---

## addresses

- id
- customer_id
- governorate
- city
- locality
- address
- extra_info
- latitude
- longitude
- maps_url

---

## repair_status_history

- id
- repair_request_id
- status
- changed_by
- note
- created_at

---

## diagnostics

- id
- repair_request_id
- technician_id
- diagnosis
- final_result
- notes
- created_at

---

## repairs

- id
- repair_request_id
- technician_id
- description
- completed_at
- warranty_id

---

## parts

- id
- name
- sku
- stock
- cost
- active

---

## repair_parts

- id
- repair_id
- part_id
- quantity
- price

---

## payments

- id
- repair_request_id
- type
- amount
- status
- received_by
- received_at

Types :

- deposit_30
- final_70

---

## invoices

- id
- repair_request_id
- invoice_number
- total
- pdf_path
- created_at

---

## warranties

- id
- repair_request_id
- duration
- start_date
- end_date
- conditions
- active

---

## driver_assignments

- id
- repair_request_id
- driver_id
- mission_type
- assigned_at
- completed_at
- status

Mission types :

- pickup
- return

---

## notifications

- id
- user_id
- repair_request_id
- type
- title
- message
- read
- created_at

---

# 51. Supabase Storage

Créer des buckets séparés si nécessaire :

- `repair-photos`
- `invoices`
- `warranty-documents`

Les fichiers doivent être protégés par des règles d'accès.

---

# 52. Supabase Security

Utiliser :

**Row Level Security (RLS)**

Principes :

### Client

Un client peut voir uniquement ses propres réparations.

### Admin

Admin peut gérer les demandes selon ses permissions.

### Technicien

Technicien peut accéder aux réparations qui lui sont attribuées.

### Livreur

Livreur peut accéder uniquement aux missions qui lui sont assignées.

Ne jamais faire confiance uniquement au frontend pour les permissions.

---

# 53. Realtime

Supabase Realtime doit être utilisé pour les changements de statut.

Exemple :

Admin change :

**Reçu à la boutique**

Le client voit immédiatement :

**📦 Reçu à la boutique**

sans avoir besoin de recharger la page.

---

# 54. Notifications

Prévoir :

### Client

- Demande créée
- Prix confirmé
- Demande confirmée
- Livreur assigné
- Téléphone récupéré
- Reçu boutique
- Réparation en cours
- Réparation terminée
- Livraison retour
- Reçu client

### Livreur

- Nouvelle mission
- Mission modifiée
- Mission annulée

### Admin

- Nouvelle demande
- Téléphone récupéré
- Téléphone reçu boutique
- Réparation terminée
- Paiement reçu

Canaux possibles :

- Dashboard
- WhatsApp
- Email
- SMS plus tard

---

# 55. WhatsApp

Prévoir une intégration WhatsApp Business / API officielle.

Événements :

### Client

Après confirmation :

**Message + Tracking Link**

### Livreur

Après assignation :

**Message + détails mission + localisation**

Le système doit conserver l'état d'envoi :

- pending
- sent
- delivered
- failed

Ne pas considérer un message WhatsApp comme envoyé si l'API a réellement échoué.

---

# 56. Gestion du prix

Le prix doit suivre cette logique :

### Au moment de la demande

Prix :

**Non défini**

### Après analyse / appel

Admin saisit :

**Prix proposé**

### Après accord du client

Admin clique :

**Confirmer**

Le système calcule automatiquement :

```text
total = prix réparation

deposit = total × 0.30

remaining = total × 0.70
```

Exemple :

```text
180 DT
30 % = 54 DT
70 % = 126 DT
```

Le prix ne doit pas être affiché comme définitif avant confirmation.

---

# 57. Modification du prix après confirmation

Si un problème supplémentaire est découvert :

1. Technicien ajoute le nouveau diagnostic.
2. Admin définit le nouveau prix.
3. Demande passe en attente de confirmation.
4. Client est contacté.
5. Client accepte ou refuse.
6. Admin enregistre la décision.
7. Le système recalcule les montants si nécessaire.

Toutes les modifications de prix doivent être enregistrées dans l'historique.

---

# 58. Annulation

Prévoir des statuts / actions d'annulation.

Exemples :

- Client annule
- Admin annule
- Client refuse le prix
- Impossible de réparer
- Pièce indisponible

Une demande annulée doit rester dans l'historique.

---

# 59. UX Mobile

Le client utilisera très probablement son téléphone.

Priorités :

- Gros boutons
- Champs faciles à remplir
- Upload photo simple
- Caméra accessible
- GPS accessible
- Progression claire
- Peu de texte inutile
- Pas de formulaire énorme sur une seule page

Le formulaire doit être multi-step.

---

# 60. Navigation Client

Header :

**Tele Lab**

- Accueil
- Comment ça marche
- Suivre ma réparation
- Réparation à domicile
- FR / العربية
- Connexion

CTA :

**Réparer mon téléphone**

---

# 61. Navigation Admin

Sidebar :

```text
Dashboard
Demandes
Clients
Réparations
Techniciens
Livreurs
Paiements
Factures
Garanties
Pièces
Notifications
Paramètres
```

---

# 62. Dashboard Livreur

Le livreur ne doit pas avoir accès au Back Office complet.

Il voit uniquement :

- Ses missions
- Détails client
- Localisation
- Téléphone
- Montant à récupérer
- Statut
- Bouton appeler
- Bouton WhatsApp
- Bouton Maps
- Confirmation récupération
- Confirmation livraison
- Paiement

---

# 63. Dashboard Technicien

Le technicien voit :

- Réparations assignées
- Appareil
- Problème
- Photos
- Prix confirmé
- Diagnostic
- Pièces
- Notes
- Statut

Il peut :

- Commencer réparation
- Ajouter diagnostic
- Ajouter pièces
- Ajouter notes
- Terminer réparation

---

# 64. Architecture Frontend recommandée

Structure conceptuelle :

```text
src/
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tracking/
│   ├── repair/
│   └── layout/
│
├── pages/
│   ├── Home/
│   ├── Tracking/
│   ├── Login/
│   ├── CustomerDashboard/
│   ├── AdminDashboard/
│   ├── DriverDashboard/
│   └── TechnicianDashboard/
│
├── services/
│   ├── supabase/
│   ├── whatsapp/
│   ├── tracking/
│   └── invoices/
│
├── hooks/
├── contexts/
├── i18n/
├── utils/
└── App
```

---

# 65. Architecture logique

```text
CLIENT
   │
   ▼
REACT WEBSITE
   │
   ▼
SUPABASE
   │
   ├── Database
   ├── Auth
   ├── Storage
   └── Realtime
   │
   ├───────────────┐
   ▼               ▼
ADMIN           CLIENT
   │
   ├── Confirmation
   ├── Price
   ├── Driver
   └── Technician
   │
   ▼
DRIVER
   │
   ▼
BOUTIQUE
   │
   ▼
TECHNICIAN
   │
   ▼
DRIVER
   │
   ▼
CLIENT
```

---

# 66. Netlify

Le projet React sera déployé sur Netlify.

Prévoir les variables d'environnement :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Les secrets sensibles ne doivent jamais être exposés dans le frontend.

Les clés privées / secrets WhatsApp doivent rester côté serveur / fonctions sécurisées.

---

# 67. Netlify Functions / Edge Functions

Pour les opérations sensibles :

- WhatsApp API
- Webhooks
- génération de certains documents
- logique nécessitant des secrets
- validation serveur

Ne pas mettre les secrets API dans React.

---

# 68. Résumé du produit

Tele Lab est une plateforme permettant à un client de commander une réparation de téléphone à domicile.

Le client :

**Demande → reçoit une confirmation → paie 30 % à la récupération → téléphone réparé → paie 70 % au retour → reçoit facture + garantie.**

Tele Lab :

**Reçoit → analyse → confirme prix → assigne livreur → reçoit téléphone → répare → assigne livreur retour → clôture.**

Le système :

**Tracking + Supabase + Realtime + WhatsApp + Dashboard Admin + Dashboard Client + Dashboard Livreur + Dashboard Technicien.**

---

# 69. Règle métier principale

Le système doit toujours respecter :

```text
Aucune confirmation
→ aucun prix définitif

Prix confirmé
→ client contacté

Client accepte
→ Admin confirme

Admin confirme
→ WhatsApp client
→ assignation livreur

30 %
→ à la récupération

70 %
→ à la livraison retour

Total
→ 100 % du prix de réparation

Livraison
→ gratuite
```

---

# 70. Statuts finaux à implémenter

Utiliser des valeurs techniques stables, par exemple :

```text
new
price_confirmed
confirmed
driver_assigned_pickup
pickup_in_delivery
picked_up
received_at_shop
repair_in_progress
repair_ready
driver_assigned_return
return_in_delivery
delivered_to_customer
cancelled
```

Les labels affichés doivent être traduits FR / AR.

Exemple :

`received_at_shop`

FR : **Reçu à la boutique**

AR : **تم استلام الهاتف في المحل**

---

# 71. Priorité de développement

## Phase 1 — MVP

1. Home
2. FR / AR
3. Formulaire multi-step
4. Marques / modèles / problèmes
5. Upload photos
6. Géolocalisation
7. Création demande
8. Tracking Number
9. Tracking page
10. Supabase
11. Auth client
12. Admin Dashboard
13. Gestion demandes
14. Confirmation prix
15. Status workflow

## Phase 2

16. Gestion livreurs
17. Assignation livreur
18. Dashboard livreur
19. WhatsApp
20. Realtime
21. Dashboard client

## Phase 3

22. Technicien
23. Diagnostic
24. Pièces
25. Facture PDF
26. Garantie
27. Paiements
28. Historique complet
29. Notifications

## Phase 4

30. Optimisation
31. Analytics
32. GPS / suivi avancé
33. Avis clients
34. PWA
35. Automatisations supplémentaires

---

# 72. Résultat attendu

Le résultat final doit être une plateforme Tele Lab :

**Simple pour le client.**

**Rapide pour l'Admin.**

**Pratique pour le livreur.**

**Utile pour le technicien.**

**Traçable de bout en bout.**

**Bilingue FR / AR.**

**Responsive.**

**Light Mode.**

**Primary #1677FF.**

**Déployable sur Netlify.**

**Backend Supabase.**

**Avec Tracking Number, WhatsApp, gestion des livreurs, prix 30/70, facture et garantie.**
