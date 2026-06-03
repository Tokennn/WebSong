-- 1. Lister les titres de tous les livres de la bibliothèque.

SELECT TITRE
FROM LIVRES

-- 2. Afficher les noms de tous les auteurs.

SELECT NOM
FROM AUTEURS

-- 3. Compter le nombre total de livres disponibles dans la bibliothèque.

SELECT COUNT(*) AS nombre_de_livres
FROM LIVRES;

-- 4. Trouver tous les lecteurs qui se sont inscrits avant le 1er janvier 2023.

SELECT NOM
FROM LECTEURS
WHERE DATE_INSCRIPTION < '2023-01-01'

-- 5. Lister les livres dont le titre contient le mot "Aventure". (ici "Aventure" n'apparaissait nulle part car il n'était pas référencé dans la base de donnée communiquée y compris pour les derniers point comme : 7 ; 10 ; 11...)

SELECT *
FROM LIVRES
WHERE TITRE LIKE '%Aventure%';

-- 6. Lister les livres par ordre alphabétique de leur titre.

SELECT *
FROM LIVRES
ORDER BY TITRE ASC;

-- 7. Afficher les livres qui n'ont pas été empruntés.

SELECT L.*
FROM LIVRES L
LEFT JOIN EMPRUNTS E ON L.ID = E.LIVRE_ID
WHERE E.LIVRE_ID IS NULL;

-- 8. Lister les auteurs et le nombre de livres qu'ils ont écrits.

SELECT A.NOM AS auteur, COUNT(L.ID) AS nombre_livres
FROM AUTEURS A
JOIN LIVRES L ON A.ID = L.AUTEUR_ID
GROUP BY A.NOM;

-- 9. Afficher les auteurs qui n'ont écrit aucun livre.

SELECT A.NOM
FROM AUTEURS A
LEFT JOIN LIVRES L ON A.ID = L.AUTEUR_ID
WHERE L.AUTEUR_ID IS NULL;


-- 10.Afficher les titres des livres empruntés par un lecteur dont le nom est "Alice".

SELECT L.TITRE
FROM LIVRES L
JOIN EMPRUNTS E ON L.ID = E.LIVRE_ID
JOIN LECTEURS LE ON E.LECTEUR_ID = LE.ID
WHERE LE.NOM = 'Alice';

-- 11. Lister les lecteurs qui ont emprunté plus de 5 livres.

SELECT LE.NOM, COUNT(E.ID) AS nombre_emprunts
FROM LECTEURS LE
JOIN EMPRUNTS E ON LE.ID = E.LECTEUR_ID
GROUP BY LE.NOM
HAVING COUNT(E.ID) > 5;

-- 12. Lister les emprunts en cours (livres non retournés).

SELECT L.TITRE, LE.NOM AS lecteur, E.DATE_EMPRUNT
FROM EMPRUNTS E
JOIN LIVRES L ON E.LIVRE_ID = L.ID
JOIN LECTEURS LE ON E.LECTEUR_ID = LE.ID
WHERE E.DATE_RETOUR IS NULL;
