-- ═══════════════════════════════════════════════════════════════════════
-- LE CATALOGUE DES SCÉNARIOS D'ENTRAÎNEMENT
--
-- Constat du 17 octobre 2026 : l'agent vocal contient 33 scénarios
-- entièrement écrits et étiquetés (/opt/atline/data/agent-config.json,
-- éditable en admin). L'app en proposait QUATRE, codés en dur, un par phase :
--
--     'Invitation' -> marche_chaud        'Démarrage' -> demarrage_filleul
--     'Suivi'      -> suivi_j3            'Coaching'  -> filleul_inactif
--
-- Vingt-neuf scénarios inaccessibles, dont les DIX scénarios d'objection,
-- alors que les objections sont le 2ᵉ blocage de la base. Troisième asset
-- écrit-déployé-invisible en deux jours, après Mem0 et les 82 leçons.
--
-- ⚠️ CE QUI TRANCHE : la phase ne peut PAS remplacer ce lien.
--     objection_pyramide  phase INVITATION  ->  entraîne `objections`
--     profil_vert         phase INVITATION  ->  entraîne `adaptation`
-- Router par phase enverrait quelqu'un qui bloque sur les objections vers un
-- exercice d'invitation. Seul le lien scénario -> compétence donne le bon
-- exercice. Même raisonnement que module -> compétence (migration 0022).
--
-- DEUX SOURCES, DEUX RÔLES, assumé : `agent-config.json` garde le contexte
-- envoyé AU MODÈLE (c'est un prompt) ; `situation` ci-dessous est la phrase
-- montrée À L'UTILISATEUR. Le slug est la jointure.
--
-- Rejouable : ON CONFLICT met à jour, et le rattachement aux compétences est
-- recalculé à chaque passage.
-- ═══════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

INSERT INTO "SimScenario" ("id","slug","titre","situation","objectif","phase","position","actif")
VALUES
 (gen_random_uuid()::text,'brise_glace','Brise-glace dans un café','Un inconnu t''aborde pendant que tu es concentré sur autre chose.','Créer le contact sans mettre mal à l''aise','INVITATION',1,true),
 (gen_random_uuid()::text,'marche_chaud','Invitation marché chaud','Un ami d''enfance te rappelle après plusieurs mois sans contact.','Créer la curiosité sans abîmer la relation','INVITATION',2,true),
 (gen_random_uuid()::text,'marche_froid','Invitation marché froid','Un appel inattendu d''un inconnu qui dit avoir trouvé ton profil.','Obtenir le droit de continuer la conversation','INVITATION',3,true),
 (gen_random_uuid()::text,'invitation_directe_rouge','Invitation directe','Un inconnu veut te parler d''une opportunité professionnelle.','Aller droit au but sans brusquer','INVITATION',4,true),
 (gen_random_uuid()::text,'invitation_indirecte_jaune','Invitation indirecte','On te demande si tu connais des gens ouverts à gagner plus.','Passer par la recommandation plutôt que la vente','INVITATION',5,true),
 (gen_random_uuid()::text,'invitation_super_indirecte','Invitation super-indirecte','« C''est probablement pas pour toi, mais j''avais une info. »','Désamorcer la pression pour créer l''envie','INVITATION',6,true),
 (gen_random_uuid()::text,'profil_vert','Invitation prudente','Une connaissance veut te présenter quelque chose, sans détails.','Donner des preuves à quelqu''un qui en réclame','INVITATION',7,true),
 (gen_random_uuid()::text,'pitch_45s','Pitch 45 secondes','On t''aborde pendant une pause, à un événement.','Dire l''essentiel en moins d''une minute','INVITATION',8,true),
 (gen_random_uuid()::text,'one_on_one_bleu','Rendez-vous en tête à tête','Tu as accepté de rencontrer quelqu''un pour en savoir plus.','Présenter avec impact, sans noyer','SUIVI',9,true),
 (gen_random_uuid()::text,'presentation_domicile','Présentation à domicile','Une soirée informelle chez quelqu''un, à quelques personnes.','Tenir un groupe sans perdre les plus réservés','SUIVI',10,true),
 (gen_random_uuid()::text,'recrutement_commercial','Recruter un commercial en poste','Tu as un bon poste stable et on te propose une activité en plus.','Convaincre quelqu''un qui n''a pas besoin de toi','SUIVI',11,true),
 (gen_random_uuid()::text,'suivi_j3','Suivi J+3 après présentation','On te rappelle trois jours après la présentation.','Obtenir une décision sans forcer','SUIVI',12,true),
 (gen_random_uuid()::text,'relance_valeur','Relance avec valeur ajoutée','Troisième appel, avec une information nouvelle.','Relancer en apportant, pas en redemandant','SUIVI',13,true),
 (gen_random_uuid()::text,'pas_maintenant_vert','« Pas maintenant » répété','Tu as déjà dit plusieurs fois que ce n''était pas le moment.','Entendre le non sans abandonner la relation','SUIVI',14,true),
 (gen_random_uuid()::text,'prospect_fantome','Prospect fantôme','Dix jours sans réponse de ta part à leurs messages.','Relancer sans harceler après un silence','SUIVI',15,true),
 (gen_random_uuid()::text,'objection_pyramide','Objection : c''est pyramidal','Quelque chose te rend méfiant sur la légalité.','Accueillir le soupçon au lieu de le nier','SUIVI',16,true),
 (gen_random_uuid()::text,'objection_temps','Objection : pas le temps','La proposition t''intéresse mais ta vie est déjà chargée.','Traiter le temps comme une priorité, pas un obstacle','SUIVI',17,true),
 (gen_random_uuid()::text,'objection_argent','Objection : pas d''argent','Un investissement initial que tu n''avais pas prévu.','Parler d''argent sans gêne ni promesse','SUIVI',18,true),
 (gen_random_uuid()::text,'objection_pas_vendeur','Objection : je ne suis pas vendeur','L''activité implique de recommander des produits.','Séparer recommander de vendre','SUIVI',19,true),
 (gen_random_uuid()::text,'objection_echec_precedent','Objection : j''ai déjà échoué','Tu as déjà tenté quelque chose de similaire, sans succès.','Reconnaître le passé sans le balayer','SUIVI',20,true),
 (gen_random_uuid()::text,'objection_conjoint','Objection : j''en parle à mon conjoint','Tu consultes toujours ton conjoint avant de décider.','Armer ton interlocuteur pour sa propre conversation','SUIVI',21,true),
 (gen_random_uuid()::text,'objection_trop_beau','Objection : trop beau pour être vrai','Les chiffres présentés te semblent peu crédibles.','Redescendre sur du concret et du vérifiable','SUIVI',22,true),
 (gen_random_uuid()::text,'objection_reflexion','Objection : je vais réfléchir','On te demande si tu es intéressé, tu n''arrives pas à trancher.','Faire sortir la vraie objection derrière le délai','SUIVI',23,true),
 (gen_random_uuid()::text,'objection_confiance','Objection : je n''y arriverai pas','Tu doutes sérieusement de tes propres capacités.','Travailler la confiance avant la méthode','SUIVI',24,true),
 (gen_random_uuid()::text,'objection_connait_personne','Objection : je ne connais personne','Une activité de réseau, et tu penses n''avoir personne.','Faire découvrir une liste qu''il croit vide','SUIVI',25,true),
 (gen_random_uuid()::text,'echelle_1_10','Technique de l''échelle 1 à 10','On te demande de noter ton intérêt de 1 à 10.','Transformer un chiffre en prochaine étape','SUIVI',26,true),
 (gen_random_uuid()::text,'demarrage_filleul','Démarrer un filleul (J+1)','Tu viens de rejoindre hier, ton parrain t''appelle.','Lancer quelqu''un dans ses 72 premières heures','DEMARRAGE',27,true),
 (gen_random_uuid()::text,'filleul_abandon','Filleul qui veut arrêter','Trois semaines sans résultat, tu appelles pour arrêter.','Entendre l''abandon sans culpabiliser','COACHING',28,true),
 (gen_random_uuid()::text,'filleul_inactif','Filleul inactif (6 semaines)','Inscrit depuis six semaines, tu n''as encore rien fait.','Remettre en mouvement sans faire à sa place','COACHING',29,true),
 (gen_random_uuid()::text,'filleul_retrouver_pourquoi','Filleul qui doute','Une période de doute profond sur le sens de tout ça.','Retrouver le pourquoi avant le comment','COACHING',30,true),
 (gen_random_uuid()::text,'promouvoir_evenement','Promouvoir un événement payant','Ton responsable veut te convaincre d''y assister.','Donner envie d''un événement sans le survendre','COACHING',31,true),
 (gen_random_uuid()::text,'coaching_leader','Leader qui fait tout lui-même','Tu as des résultats mais tu fais tout à la place de ton équipe.','Apprendre à déléguer plutôt qu''exécuter','COACHING',32,true),
 (gen_random_uuid()::text,'posture_coach','Posture face à un leader pro','Un leader professionnel veut discuter partenariat.','Tenir sa posture face à plus expérimenté','COACHING',33,true)
ON CONFLICT ("slug") DO UPDATE
  SET titre = EXCLUDED.titre, situation = EXCLUDED.situation,
      objectif = EXCLUDED.objectif, phase = EXCLUDED.phase, position = EXCLUDED.position;

-- ── Ce que chaque scénario ENTRAÎNE : 1 à 2 compétences, jamais plus ──
-- Les scénarios « couleur » (rouge, jaune, vert, bleu) entraînent aussi
-- `adaptation` : c'est exactement la compétence ajoutée aujourd'hui, et elle
-- trouve ses exercices immédiatement.
DELETE FROM "_CompetenceToSimScenario"
 WHERE "B" IN (SELECT id FROM "SimScenario");

INSERT INTO "_CompetenceToSimScenario" ("A","B")
SELECT c.id, s.id
FROM (VALUES
 ('brise_glace','invitation'),
 ('marche_chaud','invitation'),('marche_chaud','liste-noms'),
 ('marche_froid','invitation'),
 ('invitation_directe_rouge','invitation'),('invitation_directe_rouge','adaptation'),
 ('invitation_indirecte_jaune','invitation'),('invitation_indirecte_jaune','adaptation'),
 ('invitation_super_indirecte','invitation'),
 ('profil_vert','invitation'),('profil_vert','adaptation'),
 ('pitch_45s','presentation'),
 ('one_on_one_bleu','presentation'),('one_on_one_bleu','adaptation'),
 ('presentation_domicile','presentation'),
 ('recrutement_commercial','presentation'),('recrutement_commercial','objections'),
 ('suivi_j3','suivi'),
 ('relance_valeur','suivi'),
 ('pas_maintenant_vert','suivi'),('pas_maintenant_vert','adaptation'),
 ('prospect_fantome','suivi'),
 ('objection_pyramide','objections'),
 ('objection_temps','objections'),('objection_temps','organisation'),
 ('objection_argent','objections'),
 ('objection_pas_vendeur','objections'),
 ('objection_echec_precedent','objections'),('objection_echec_precedent','etat-esprit'),
 ('objection_conjoint','objections'),
 ('objection_trop_beau','objections'),
 ('objection_reflexion','objections'),('objection_reflexion','conclusion'),
 ('objection_confiance','objections'),('objection_confiance','etat-esprit'),
 ('objection_connait_personne','objections'),('objection_connait_personne','liste-noms'),
 ('echelle_1_10','conclusion'),
 ('demarrage_filleul','demarrage'),('demarrage_filleul','duplication'),
 ('filleul_abandon','duplication'),('filleul_abandon','etat-esprit'),
 ('filleul_inactif','duplication'),
 ('filleul_retrouver_pourquoi','duplication'),('filleul_retrouver_pourquoi','pourquoi'),
 ('promouvoir_evenement','leadership'),
 ('coaching_leader','leadership'),('coaching_leader','duplication'),
 ('posture_coach','leadership'),('posture_coach','adaptation')
) AS m(slug, comp)
JOIN "SimScenario" s ON s.slug = m.slug
JOIN "Competence"  c ON c.id   = m.comp;

-- ── Rattacher l'historique : 38 sessions portent déjà un slug ──
UPDATE "SimSession" x SET "scenarioId" = s.id
  FROM "SimScenario" s WHERE s.slug = x."characterId" AND x."scenarioId" IS NULL;

SELECT 'scénarios', count(*) FROM "SimScenario";
SELECT 'liens compétence', count(*) FROM "_CompetenceToSimScenario";
SELECT 'sessions rattachées', count(*) FILTER (WHERE "scenarioId" IS NOT NULL), count(*) FROM "SimSession";
SELECT 'compétences sans exercice', string_agg(c.id, ', ')
  FROM "Competence" c
 WHERE NOT EXISTS (SELECT 1 FROM "_CompetenceToSimScenario" j WHERE j."A" = c.id);
