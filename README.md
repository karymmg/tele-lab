# Tele Lab — Scaffold

Scaffold initial du projet Tele Lab (React + Vite + TypeScript + Supabase + React Router + i18n FR/AR).
Basé sur le cahier des charges complet et le design system hybride (Light Mode + accents Neon).

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseigner VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

## Structure

```
src/
├── components/
│   ├── ui/          → Button, StatusBadge (design system appliqué)
│   ├── forms/        → à construire : formulaire multi-step de demande
│   ├── tracking/      → à construire : timeline de suivi
│   ├── repair/        → à construire : cartes/diagnostic technicien
│   └── layout/        → Header (nav + switch FR/AR), Footer
│
├── pages/
│   ├── Home/           → page d'accueil complète (Hero, services, paiement 30/70, stats)
│   ├── Tracking/        → placeholder
│   ├── Login/           → placeholder
│   ├── CustomerDashboard/    → placeholder
│   ├── AdminDashboard/       → placeholder
│   ├── DriverDashboard/      → placeholder
│   └── TechnicianDashboard/  → placeholder
│
├── services/
│   ├── supabase/    → client Supabase configuré
│   ├── whatsapp/     → à construire (Netlify Function requise pour les secrets)
│   ├── tracking/      → à construire
│   └── invoices/      → à construire (génération PDF)
│
├── i18n/            → fr.json / ar.json + bascule RTL automatique
├── styles/          → tokens.css (design system) + global.css
└── utils/
    ├── status.ts     → statuts techniques du cahier des charges §70
    └── pricing.ts    → calcul 30 % / 70 % (§56)
```

## Ce qui est déjà fonctionnel

- ✅ Home page complète avec le design system hybride Light + Neon
- ✅ i18n FR/AR avec bascule RTL automatique sur `<html dir="">`
- ✅ Client Supabase prêt à l'emploi (variables d'environnement)
- ✅ Statuts de réparation typés (§70) + logique de badges colorés
- ✅ Calcul du dépôt 30 % / solde 70 % (§56)
- ✅ Config Netlify (redirects SPA)

## Prochaines étapes (voir §71 du cahier des charges — Phase 1 MVP)

1. Formulaire multi-step (Appareil → Client → Adresse → Récapitulatif) dans `components/forms/`
2. Recherche/autocomplete marques & modèles (données à charger depuis Supabase)
3. Upload photo (caméra + galerie) vers Supabase Storage
4. Géolocalisation navigateur + champs manuels de secours
5. Génération du Tracking Number + page de suivi publique
6. Authentification client (Supabase Auth) + Dashboard Client
7. Back Office Admin : gestion des demandes, confirmation de prix, workflow de statuts

## Sécurité

- Les secrets WhatsApp et toute logique nécessitant des clés privées doivent vivre dans des **Netlify Functions / Edge Functions**, jamais dans le code React.
- `.env` n'est jamais commité (voir `.gitignore`).
