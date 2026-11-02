# Madrid · Español

Application personnelle d'apprentissage de l'espagnol (objectif : B1 au départ, C1 en immersion).

- Web app installable sur iPhone (Safari → Partager → « Sur l'écran d'accueil »).
- Données de progression stockées uniquement sur l'appareil.
- Répétition espacée FSRS (`ts-fsrs`), parcours par missions.

## Développement

```bash
npm install
npm run dev      # serveur local
npm run build    # version de production dans dist/
```

Chaque push sur `main` publie automatiquement l'application sur GitHub Pages.
