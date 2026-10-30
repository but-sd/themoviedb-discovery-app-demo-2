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

Pour ajouter ou mettre à jour des genres depuis un fichier CSV contenant les
colonnes `id` et `name` :

```csv
id,name
28,Action
35,Comedy
```

```sh
node src/back-end/backend-cli.ts add-genres ./data/genres.csv
```

Pour utiliser un autre fichier SQLite :

```sh
node src/back-end/backend-cli.ts --path ./data/custom-movies.sqlite add-genres ./data/genres.csv
```

Pour supprimer uniquement les genres qui ne sont associés à aucun film :

```sh
node src/back-end/backend-cli.ts clean-genres
```
