-- 1. Lister tous les matchs avec les équipes participantes.

SELECT 
    M.ID AS Match_ID,
    M.DATE AS Date,
    E1.NOM AS Equipe1,
    E2.NOM AS Equipe2
FROM 
    MATCHS M
JOIN 
    EQUIPES E1 ON M.EQUIPE1_ID = E1.ID
JOIN 
    EQUIPES E2 ON M.EQUIPE2_ID = E2.ID;

-- 2. Afficher les scores de chaque joueur dans un match spécifique (par exemple,Match ID = 1).

SELECT 
    J.ID AS Joueur_ID,
    J.NOM AS Joueur_Nom,
    R.POINTS AS Points
FROM 
    RESULTATS R
JOIN 
    JOUEURS J ON R.JOUEUR_ID = J.ID
WHERE 
    R.MATCH_ID = 1;

-- 3. Trouver les équipes qui ont participé à un match spécifique (par exemple, Match ID = 1).

SELECT 
    E.NOM AS Equipe_Nom
FROM 
    MATCHS M
JOIN 
    EQUIPES E ON M.EQUIPE1_ID = E.ID OR M.EQUIPE2_ID = E.ID
WHERE 
    M.ID = 1;

-- 4. Trouver les équipes avec le score moyen le plus élevé.


SELECT 
    E.NOM AS Equipe_Nom,
    AVG(R.POINTS) AS Score_Moyen
FROM 
    RESULTATS R
JOIN 
    JOUEURS J ON R.JOUEUR_ID = J.ID
JOIN 
    EQUIPES E ON J.EQUIPE_ID = E.ID
GROUP BY 
    E.ID
ORDER BY 
    Score_Moyen DESC
LIMIT 1;


-- 5. Afficher les équipes qui n'ont pas encore gagné de match.

SELECT 
    E.NOM AS Equipe_Nom
FROM 
    EQUIPES E
WHERE 
    E.ID NOT IN (
        SELECT DISTINCT 
            M.EQUIPE1_ID
        FROM 
            MATCHS M
        JOIN 
            RESULTATS R1 ON M.ID = R1.MATCH_ID
        JOIN 
            RESULTATS R2 ON M.ID = R2.MATCH_ID
        WHERE 
            M.EQUIPE1_ID = R1.JOUEUR_ID AND R1.POINTS > R2.POINTS
        UNION
        SELECT DISTINCT 
            M.EQUIPE2_ID
        FROM 
            MATCHS M
        JOIN 
            RESULTATS R1 ON M.ID = R1.MATCH_ID
        JOIN 
            RESULTATS R2 ON M.ID = R2.MATCH_ID
        WHERE 
            M.EQUIPE2_ID = R2.JOUEUR_ID AND R2.POINTS > R1.POINTS
    );

-- 6. Lister les joueurs ayant marqué le plus de points au total.

SELECT 
    J.NOM AS Joueur_Nom,
    SUM(R.POINTS) AS Total_Points
FROM 
    RESULTATS R
JOIN 
    JOUEURS J ON R.JOUEUR_ID = J.ID
GROUP BY 
    J.ID
ORDER BY 
    Total_Points DESC
LIMIT 1;

-- 7. Lister les joueurs et leur équipe, triés par points marqués (points totaux).

SELECT 
    J.NOM AS Joueur_Nom,
    E.NOM AS Equipe_Nom,
    SUM(R.POINTS) AS Total_Points
FROM 
    RESULTATS R
JOIN 
    JOUEURS J ON R.JOUEUR_ID = J.ID
JOIN 
    EQUIPES E ON J.EQUIPE_ID = E.ID
GROUP BY 
    J.ID, E.ID
ORDER BY 
    Total_Points DESC;

-- 8. Suivre les performances d'une équipe dans les différents matchs.

SELECT 
    M.ID AS Match_ID,
    M.DATE AS Match_Date,
    E1.NOM AS Equipe1_Nom,
    E2.NOM AS Equipe2_Nom,
    SUM(CASE WHEN J.EQUIPE_ID = M.EQUIPE1_ID THEN R.POINTS ELSE 0 END) AS Equipe1_Score,
    SUM(CASE WHEN J.EQUIPE_ID = M.EQUIPE2_ID THEN R.POINTS ELSE 0 END) AS Equipe2_Score,
    CASE
        WHEN SUM(CASE WHEN J.EQUIPE_ID = M.EQUIPE1_ID THEN R.POINTS ELSE 0 END) > SUM(CASE WHEN J.EQUIPE_ID = M.EQUIPE2_ID THEN R.POINTS ELSE 0 END) THEN 'Gagné'
        WHEN SUM(CASE WHEN J.EQUIPE_ID = M.EQUIPE1_ID THEN R.POINTS ELSE 0 END) < SUM(CASE WHEN J.EQUIPE_ID = M.EQUIPE2_ID THEN R.POINTS ELSE 0 END) THEN 'Perdu'
        ELSE 'Nul'
    END AS Resultat
FROM 
    MATCHS M
JOIN 
    RESULTATS R ON M.ID = R.MATCH_ID
JOIN 
    JOUEURS J ON R.JOUEUR_ID = J.ID
JOIN 
    EQUIPES E1 ON M.EQUIPE1_ID = E1.ID
JOIN 
    EQUIPES E2 ON M.EQUIPE2_ID = E2.ID
WHERE 
    M.EQUIPE1_ID = 1 OR M.EQUIPE2_ID = 1
    -- -> ici l'ID d'équipe est 1
GROUP BY 
    M.ID
ORDER BY 
    M.DATE;

-- 9.Lister les joueurs qui ont participé à tous les matchs d'une équipe spécifique(par exemple, Équipe ID = 1).

SELECT J.ID AS Joueur_ID, J.NOM AS Joueur_Nom
FROM JOUEURS J
WHERE J.EQUIPE_ID = 1
AND NOT EXISTS (
    SELECT 1
    FROM MATCHS M
    WHERE (M.EQUIPE1_ID = J.EQUIPE_ID OR M.EQUIPE2_ID = J.EQUIPE_ID)
    AND M.ID NOT IN (
        SELECT R.MATCH_ID
        FROM RESULTATS R
        WHERE R.JOUEUR_ID = J.ID
    )
)
ORDER BY J.NOM;

-- 10. Trouver les équipes ayant remporté le plus de matchs.

SELECT E.NOM AS Equipe_Nom, COUNT(*) AS Nombre_Victoires
FROM MATCHS M
JOIN RESULTATS R1 ON M.ID = R1.MATCH_ID
JOIN RESULTATS R2 ON M.ID = R2.MATCH_ID
JOIN EQUIPES E ON (M.EQUIPE1_ID = E.ID OR M.EQUIPE2_ID = E.ID)
WHERE (M.EQUIPE1_ID = E.ID AND R1.POINTS > R2.POINTS)
   OR (M.EQUIPE2_ID = E.ID AND R2.POINTS > R1.POINTS)
GROUP BY E.ID
ORDER BY Nombre_Victoires DESC;

-- REMARQUE : Comme l'ancien TP celui-ci n'avais pas de data retour !



