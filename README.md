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

Pour ajouter ou mettre à jour des pays, utiliser un CSV avec les colonnes `code`
et `name`. Le code pays doit contenir deux lettres majuscules (ISO 3166-1 alpha-2) :

```csv
code,name
FR,France
GB,United Kingdom
US,United States of America
```

Le fichier `data/countries.csv` fournit ces trois pays comme exemples.

```sh
node src/back-end/backend-cli.ts add-countries ./data/countries.csv
node src/back-end/backend-cli.ts --path ./data/custom-movies.sqlite add-countries ./data/countries.csv
```

Pour supprimer uniquement les pays qui ne sont associés à aucun film dans
`production_countries` :

```sh
node src/back-end/backend-cli.ts clean-countries
node src/back-end/backend-cli.ts --path ./data/custom-movies.sqlite clean-countries
```
