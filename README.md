# themoviedb-discovery-app-demo-2

La liste des films populaires charge automatiquement les pages suivantes à
l'approche du bas de la page, sans remplacer les films déjà affichés. Les
paramètres `language`, `region` et `page` de l'URL sont conservés comme critères
de départ.

Un bouton « Charger plus de films » permet aussi un chargement manuel. En cas
d'erreur, les films affichés sont conservés et le bouton « Réessayer » relance
la page qui a échoué. Le chargement s'arrête à la dernière page disponible
(dans la limite des 500 pages accessibles via TMDB).
