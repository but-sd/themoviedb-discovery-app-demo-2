# themoviedb-discovery-app-demo-2

## Collecte des données

Les données collectées sont stockées dans SQLite, par défaut dans
`data/movies.sqlite`. Le schéma de référence est défini dans
[`src/back-end/database/schema.ts`](src/back-end/database/schema.ts).

## Base de données

Pour créer et initialiser la base de données par défaut :

```sh
node src/back-end/backend-cli.ts
```

Pour choisir un autre fichier SQLite :

```sh
node src/back-end/backend-cli.ts --path ./data/custom-movies.sqlite
```
