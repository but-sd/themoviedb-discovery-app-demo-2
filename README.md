# themoviedb-discovery-app-demo-2

## Films par année

La route `GET /api/discover/movies?year=2020` interroge l'API Discover de
TMDB avec le filtre `primary_release_year` (année de sortie principale).
Le paramètre `year` est obligatoire et doit être une année sur quatre chiffres
entre 1000 et 9999 ; sinon la route renvoie une erreur HTTP 400.

Les paramètres optionnels `language`, `page` et `region` utilisent par défaut
`fr-FR`, `1` et `FR`. Par exemple :

```text
/api/discover/movies?year=2020&language=fr-FR&page=2&region=FR
```

La réponse conserve le format de `movies-api` : `page`, `results`,
`total_pages` et `total_results`. Chaque appel récupère une seule page ;
utiliser `page` pour parcourir les suivantes. Une erreur TMDB renvoie une
erreur HTTP 500.

## Collecte des données

Les données collectées sont stockées dans SQLite, par défaut dans
`data/movies.sqlite`. Le schéma de référence est défini dans
[`src/back-end/database/schema.ts`](src/back-end/database/schema.ts).
Les colonnes `movies.budget`, `movies.revenue` et `movies.runtime_minutes`
acceptent `NULL` pour une valeur inconnue ou une valeur strictement positive ;
zéro et les valeurs négatives sont refusés.

## Base de données

### Importer depuis TMDB

Le service `importTmdbMovies` dans `src/back-end/tmdb-movies-importer.ts` prend
une connexion SQLite et une année de sortie principale :

```ts
const result = await importTmdbMovies(database, 2020, {
  language: 'fr-FR',
  region: 'FR',
});
// result.imported : nombre de films enregistrés
// result.failures : { movieId, page, error } pour chaque film rejeté
```

Il parcourt Discover et récupère le détail de chaque film. Configurer
`TMDB_ACCESS_TOKEN` pour ces appels. Les genres et pays absents sont créés ;
les noms des entrées existantes sont conservés. Le film et ses associations
sont enregistrés dans un savepoint : une erreur de données ou d'association
annule uniquement les écritures de ce film, y compris ses nouveaux genres et
pays. L'erreur est journalisée et retournée dans `failures`, puis l'import
continue. Les identifiants répétés ne sont tentés qu'une fois par import.
Une erreur Discover ou une pagination inaccessible fait échouer le service
sans annuler les films déjà enregistrés. `add-movies` reste un import CSV
uniquement et n'appelle pas ce service.

### Importer des films

La commande `add-movies` ajoute ou met à jour les films depuis un CSV local,
sans appel API, serveur HTTP ni `TMDB_ACCESS_TOKEN` :

```sh
node src/back-end/backend-cli.ts add-movies ./data/movies.csv
node src/back-end/backend-cli.ts --path ./data/custom-movies.sqlite add-movies ./data/movies.csv
```

Le fichier `data/movies.csv` contient exactement les dix premiers films de
l'exemple de réponse 200 de la [documentation TMDB Discover](https://developer.themoviedb.org/reference/discover-movie),
consultée le 31 octobre 2026. Les identifiants, titres, dates, genres, chemins
d'images et statistiques proviennent de cet exemple statique, et non de données
actualisées. Les résumés sont volontairement omis.

Les champs complémentaires suivent le format [Movie Details](https://developer.themoviedb.org/reference/movie-details).
Les durées et montants USD proviennent des pages publiques TMDB ci-dessous,
consultées le 31 octobre 2026 ; les pays proviennent des infoboxes
Country/Countries de Wikipédia. Ce sont des pays de production du film,
pas des lieux de tournage, ni une reproduction vérifiée du tableau TMDB
`production_countries`. Pour Evil Dead Rise, la
[New Zealand Film Commission](https://www.nzfilm.co.nz/films/evil-dead-rise)
confirme aussi la coproduction Nouvelle-Zélande/Irlande.

| Film                                   | Durée et montants                                              | Pays                                                                              |
| -------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Ant-Man and the Wasp: Quantumania      | [TMDB](https://www.themoviedb.org/movie/640146?language=en-US) | [Wikipédia](https://en.wikipedia.org/wiki/Ant-Man_and_the_Wasp:_Quantumania)      |
| The Super Mario Bros. Movie            | [TMDB](https://www.themoviedb.org/movie/502356?language=en-US) | [Wikipédia](https://en.wikipedia.org/wiki/The_Super_Mario_Bros._Movie)            |
| Shazam! Fury of the Gods               | [TMDB](https://www.themoviedb.org/movie/594767?language=en-US) | [Wikipédia](https://en.wikipedia.org/wiki/Shazam!_Fury_of_the_Gods)               |
| Avatar: The Way of Water               | [TMDB](https://www.themoviedb.org/movie/76600?language=en-US)  | [Wikipédia](https://en.wikipedia.org/wiki/Avatar:_The_Way_of_Water)               |
| The Last Kingdom: Seven Kings Must Die | [TMDB](https://www.themoviedb.org/movie/948713?language=en-US) | [Wikipédia](https://en.wikipedia.org/wiki/The_Last_Kingdom:_Seven_Kings_Must_Die) |
| Creed III                              | [TMDB](https://www.themoviedb.org/movie/677179?language=en-US) | [Wikipédia](https://en.wikipedia.org/wiki/Creed_III)                              |
| Evil Dead Rise                         | [TMDB](https://www.themoviedb.org/movie/713704?language=en-US) | [Wikipédia](https://en.wikipedia.org/wiki/Evil_Dead_Rise)                         |
| Murder Mystery 2                       | [TMDB](https://www.themoviedb.org/movie/638974?language=en-US) | [Wikipédia](https://en.wikipedia.org/wiki/Murder_Mystery_2)                       |
| Puss in Boots: The Last Wish           | [TMDB](https://www.themoviedb.org/movie/315162?language=en-US) | [Wikipédia](https://en.wikipedia.org/wiki/Puss_in_Boots:_The_Last_Wish)           |
| John Wick: Chapter 4                   | [TMDB](https://www.themoviedb.org/movie/603692?language=en-US) | [Wikipédia](https://en.wikipedia.org/wiki/John_Wick:_Chapter_4)                   |

Les budgets et recettes de Seven Kings Must Die et Murder Mystery 2 restent
vides : TMDB affiche « - », ce qui signifie non renseigné, pas zéro.
Les durées et montants peuvent différer d'autres sources ; les valeurs affichées
par TMDB sont conservées sans convertir arbitrairement des fourchettes de budget
en montants exacts. Les colonnes requises sont :

```text
id,title,original_title,original_language,overview,release_date,popularity,vote_average,vote_count,poster_path,backdrop_path,runtime,budget,revenue,genres,production_countries
```

Les colonnes peuvent être réordonnées. `genres` contient uniquement un tableau
JSON d'identifiants entiers positifs, par exemple `"[28,35]"`. Le CLI ne vérifie
pas leur existence en base et ne nécessite pas d'import préalable des genres.
`production_countries` contient des
objets `{ "iso_3166_1": "FR", "name": "France" }`. Utiliser `[]` pour une liste
vide. Dans une cellule CSV entre guillemets, doubler les guillemets JSON.
Les identifiants sont des entiers positifs, les codes langue/pays deux lettres
minuscules/majuscules, et les dates au format `YYYY-MM-DD`. Les valeurs numériques
sont non négatives ; `vote_average` est entre 0 et 10. `runtime`, `budget`,
`revenue` et `vote_count` sont des entiers. Les cellules `overview`,
`release_date`, `poster_path`, `backdrop_path`, `runtime`, `budget` et `revenue`
peuvent être vides.

L'import stocke la durée dans `runtime_minutes` et
renseigne `collected_at` ; `release_year` est calculé par SQLite. Les valeurs
TMDB inconnues (durée, budget ou recettes à zéro, date vide) deviennent `NULL`.

La commande `add-movies` utilise directement `upsertMovies` et modifie uniquement
la table `movies`. Les colonnes JSON sont validées au niveau du format CSV,
mais leurs valeurs ne sont pas enregistrées : genres, pays et associations
existants restent inchangés.

Le service distinct `saveMovieDetails` (`src/back-end/movie-persistence-service.ts`)
utilise les repositories pour créer les genres et pays absents, puis ajouter
ou mettre à jour le film, avant de remplacer ses associations dans `movie_genres` et
`production_countries`. Le repository movie reste dédié à la table `movies`.
Chaque film et ses associations sont enregistrés atomiquement ; les associations
des autres films et les genres/pays non utilisés restent inchangés. Le service
peut aussi être appelé dans une transaction existante, sans la valider ;
il n'est pas utilisé par `add-movies`.
Les fonctions de remplacement d'associations utilisent aussi leurs propres
savepoints : un échec restaure les anciens liens, même lorsqu'elles sont appelées
directement, sans valider ni annuler la transaction de l'appelant.
Le fichier entier est importé dans une transaction : une erreur annule toutes
ses écritures et termine la commande avec un code non nul. Relancer la commande
met à jour les mêmes identifiants sans doublons ; le dernier enregistrement
l'emporte si un identifiant apparaît plusieurs fois. Le service API Discover
existant n'est plus utilisé par le CLI.

Pour supprimer **tous les films**, utiliser `clean-movies`. Les genres et les
pays sont conservés ; SQLite supprime automatiquement les associations des films
via les contraintes `ON DELETE CASCADE`. La commande indique le nombre de films
supprimés.

```sh
node src/back-end/backend-cli.ts clean-movies
node src/back-end/backend-cli.ts --path ./data/custom-movies.sqlite clean-movies
```

Pour créer et initialiser la base de données par défaut :

```sh
node src/back-end/backend-cli.ts create-database
```

Cette commande crée uniquement le schéma, sans importer de données ni appeler
l'API. Le lancement sans sous-commande reste également pris en charge :

Pour recréer les tables de l'application si la base existe :

```sh
node src/back-end/backend-cli.ts --path ./data/custom-movies.sqlite create-database --force
```

**Attention :** `--force` (ou `-f`) supprime tous les films, genres, pays et
associations avant de recréer leur schéma actuel. L'opération est atomique ;
sans cette option, les données existantes sont conservées. Les éventuelles
tables étrangères à l'application ne sont pas supprimées.

```sh
node src/back-end/backend-cli.ts
```

Pour choisir un autre fichier SQLite :

```sh
node src/back-end/backend-cli.ts --path ./data/custom-movies.sqlite create-database
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
