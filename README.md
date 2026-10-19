# themoviedb-discovery-app-demo-2

## Collecte de films

Avec Node.js 24 ou plus et `TMDB_ACCESS_TOKEN` dans `.env` :

```sh
npm run collect:movies -- 2020
```

Le service `collectMovies(year)` collecte les pages TMDB Discover pour une
année (de 1870 à l'année courante) et stocke les films dans
`data/movies.sqlite`. Il partage sa recherche avec
`GET /api/movies/discover?year=2020`. Aucun serveur local n'est nécessaire.

La table `movies` contient les informations des films, leur année, leurs
statistiques et la date de collecte. `genre_ids` contient un tableau JSON.
Une nouvelle collecte met à jour les films existants, identifiés par leur ID
TMDB, sans doublons ni suppression des autres années.

Les écritures sont transactionnelles et commencent uniquement après récupération
de toutes les pages. En cas d'erreur réseau ou si l'année dépasse la limite TMDB
de 500 pages, la collecte échoue sans enregistrer de résultats partiels.
Un second argument optionnel du service permet de choisir le chemin SQLite.

La création du fichier SQLite, de la table et de son index est centralisée
dans `src/back-end/movies-database.ts` via `createMoviesDatabase()`.
Les insertions et mises à jour transactionnelles sont exposées par
`upsertMovies(database, movies, year)` dans le même module.
Le service de collecte appelle ces fonctions et ferme la connexion.
