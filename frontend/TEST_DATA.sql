-- ============================================================================
-- CHAMPION'S ACADEMY - DONNÉES DE TEST
-- ============================================================================
-- Ce script crée des données de test pour vérifier que la page Membres
-- fonctionne correctement
-- ============================================================================

-- ============================================================================
-- SECTION 1: VÉRIFICATION
-- ============================================================================

-- Vérifier combien de membres existent déjà
SELECT
  'Membres existants' as type,
  COUNT(*) as count
FROM public.members;

-- ============================================================================
-- SECTION 2: CRÉATION DE MEMBRES DE TEST
-- ============================================================================

-- Créer 50 membres de test (si la table est vide ou pour compléter)
INSERT INTO public.members (member_code, first_name, last_name, email, phone, status, birthdate, address, is_competitor)
VALUES
  -- Membres actifs (35)
  ('M0001', 'Jean', 'Dupont', 'jean.dupont@test.com', '0612345678', 'active', '1990-05-15', '123 Rue de Paris, Bruxelles', false),
  ('M0002', 'Marie', 'Martin', 'marie.martin@test.com', '0623456789', 'active', '1988-03-22', '456 Avenue Louise, Bruxelles', false),
  ('M0003', 'Pierre', 'Durand', 'pierre.durand@test.com', '0634567890', 'active', '1992-07-10', '789 Chaussée de Wavre, Bruxelles', true),
  ('M0004', 'Sophie', 'Bernard', 'sophie.bernard@test.com', '0645678901', 'active', '1995-11-30', '321 Rue Neuve, Bruxelles', false),
  ('M0005', 'Luc', 'Thomas', 'luc.thomas@test.com', '0656789012', 'active', '1987-01-18', '654 Boulevard Anspach, Bruxelles', false),
  ('M0006', 'Emma', 'Petit', 'emma.petit@test.com', '0667890123', 'active', '1993-09-05', '987 Rue du Midi, Bruxelles', false),
  ('M0007', 'Lucas', 'Robert', 'lucas.robert@test.com', '0678901234', 'active', '1991-12-20', '147 Avenue de la Couronne, Bruxelles', true),
  ('M0008', 'Léa', 'Richard', 'lea.richard@test.com', '0689012345', 'active', '1994-04-12', '258 Rue Haute, Bruxelles', false),
  ('M0009', 'Tom', 'Dubois', 'tom.dubois@test.com', '0690123456', 'active', '1989-08-25', '369 Boulevard du Midi, Bruxelles', false),
  ('M0010', 'Chloé', 'Moreau', 'chloe.moreau@test.com', '0601234567', 'active', '1996-06-14', '741 Rue de Flandre, Bruxelles', false),
  ('M0011', 'Hugo', 'Simon', 'hugo.simon@test.com', '0612345679', 'active', '1985-02-28', '852 Chaussée d\'Ixelles, Bruxelles', true),
  ('M0012', 'Julie', 'Laurent', 'julie.laurent@test.com', '0623456790', 'active', '1997-10-03', '963 Rue Royale, Bruxelles', false),
  ('M0013', 'Alexandre', 'Michel', 'alexandre.michel@test.com', '0634567801', 'active', '1986-05-17', '159 Boulevard Lambermont, Bruxelles', false),
  ('M0014', 'Camille', 'Lefebvre', 'camille.lefebvre@test.com', '0645678912', 'active', '1998-12-08', '357 Rue de la Loi, Bruxelles', false),
  ('M0015', 'Nathan', 'Leroy', 'nathan.leroy@test.com', '0656789023', 'active', '1984-07-21', '486 Avenue Louise, Bruxelles', true),
  ('M0016', 'Sarah', 'Roux', 'sarah.roux@test.com', '0667890134', 'active', '1999-03-19', '597 Rue du Bailli, Bruxelles', false),
  ('M0017', 'Julien', 'Vincent', 'julien.vincent@test.com', '0678901245', 'active', '1983-11-11', '618 Chaussée de Charleroi, Bruxelles', false),
  ('M0018', 'Laura', 'Fournier', 'laura.fournier@test.com', '0689012356', 'active', '2000-01-27', '729 Rue de Namur, Bruxelles', false),
  ('M0019', 'Maxime', 'Girard', 'maxime.girard@test.com', '0690123467', 'active', '1982-09-04', '840 Boulevard de Waterloo, Bruxelles', true),
  ('M0020', 'Manon', 'Bonnet', 'manon.bonnet@test.com', '0601234578', 'active', '2001-06-23', '951 Rue du Trône, Bruxelles', false),
  ('M0021', 'Antoine', 'Dupuis', 'antoine.dupuis@test.com', '0612345680', 'active', '1981-04-16', '162 Avenue des Arts, Bruxelles', false),
  ('M0022', 'Inès', 'Lambert', 'ines.lambert@test.com', '0623456791', 'active', '2002-08-09', '273 Rue de Spa, Bruxelles', false),
  ('M0023', 'Mathis', 'Fontaine', 'mathis.fontaine@test.com', '0634567802', 'active', '1980-12-30', '384 Chaussée de Vleurgat, Bruxelles', true),
  ('M0024', 'Lucie', 'Rousseau', 'lucie.rousseau@test.com', '0645678913', 'active', '2003-02-14', '495 Rue de Stassart, Bruxelles', false),
  ('M0025', 'Raphaël', 'Morel', 'raphael.morel@test.com', '0656789024', 'active', '1979-10-07', '516 Boulevard de l\'Empereur, Bruxelles', false),
  ('M0026', 'Zoé', 'Andre', 'zoe.andre@test.com', '0667890135', 'active', '2004-05-21', '627 Rue de Flandre, Bruxelles', false),
  ('M0027', 'Théo', 'Garcia', 'theo.garcia@test.com', '0678901246', 'active', '1978-01-13', '738 Chaussée de Louvain, Bruxelles', true),
  ('M0028', 'Alice', 'Blanc', 'alice.blanc@test.com', '0689012357', 'active', '2005-11-28', '849 Rue du Midi, Bruxelles', false),
  ('M0029', 'Louis', 'Guerin', 'louis.guerin@test.com', '0690123468', 'active', '1977-07-02', '960 Avenue de la Toison d\'Or, Bruxelles', false),
  ('M0030', 'Clara', 'Muller', 'clara.muller@test.com', '0601234579', 'active', '2006-03-17', '171 Rue Neuve, Bruxelles', false),
  ('M0031', 'Gabriel', 'Martinez', 'gabriel.martinez@test.com', '0612345681', 'active', '1976-09-24', '282 Boulevard Anspach, Bruxelles', true),
  ('M0032', 'Jade', 'Lopez', 'jade.lopez@test.com', '0623456792', 'active', '2007-12-06', '393 Rue Haute, Bruxelles', false),
  ('M0033', 'Arthur', 'Sanchez', 'arthur.sanchez@test.com', '0634567803', 'active', '1975-05-19', '404 Chaussée de Wavre, Bruxelles', false),
  ('M0034', 'Lina', 'Roussel', 'lina.roussel@test.com', '0645678914', 'active', '2008-08-11', '515 Avenue Louise, Bruxelles', false),
  ('M0035', 'Noah', 'Faure', 'noah.faure@test.com', '0656789025', 'active', '1974-02-03', '626 Rue du Bailli, Bruxelles', true),

  -- Membres inactifs (10)
  ('M0036', 'Anna', 'Renard', 'anna.renard@test.com', '0667890136', 'inactive', '1973-10-26', '737 Boulevard de Waterloo, Bruxelles', false),
  ('M0037', 'Adam', 'Giraud', 'adam.giraud@test.com', '0678901247', 'inactive', '1972-06-15', '848 Rue de Namur, Bruxelles', false),
  ('M0038', 'Mila', 'Leclerc', 'mila.leclerc@test.com', '0689012358', 'inactive', '1971-04-08', '959 Chaussée d\'Ixelles, Bruxelles', false),
  ('M0039', 'Ethan', 'Bourgeois', 'ethan.bourgeois@test.com', '0690123469', 'inactive', '1970-12-22', '160 Rue Royale, Bruxelles', false),
  ('M0040', 'Rose', 'Perrin', 'rose.perrin@test.com', '0601234570', 'inactive', '1969-08-14', '271 Boulevard Lambermont, Bruxelles', false),
  ('M0041', 'Victor', 'Morin', 'victor.morin@test.com', '0612345682', 'inactive', '1968-03-27', '382 Rue de la Loi, Bruxelles', false),
  ('M0042', 'Eva', 'Gauthier', 'eva.gauthier@test.com', '0623456793', 'inactive', '1967-11-09', '493 Chaussée de Charleroi, Bruxelles', false),
  ('M0043', 'Paul', 'Dumas', 'paul.dumas@test.com', '0634567804', 'inactive', '1966-07-01', '504 Rue du Trône, Bruxelles', false),
  ('M0044', 'Lola', 'Lemoine', 'lola.lemoine@test.com', '0645678915', 'inactive', '1965-02-18', '615 Avenue des Arts, Bruxelles', false),
  ('M0045', 'Sacha', 'Masson', 'sacha.masson@test.com', '0656789026', 'inactive', '1964-09-12', '726 Rue de Spa, Bruxelles', false),

  -- Membres suspendus (5)
  ('M0046', 'Nina', 'Carpentier', 'nina.carpentier@test.com', '0667890137', 'suspended', '1963-05-05', '837 Chaussée de Vleurgat, Bruxelles', false),
  ('M0047', 'Léo', 'Bertrand', 'leo.bertrand@test.com', '0678901248', 'suspended', '1962-01-29', '948 Rue de Stassart, Bruxelles', false),
  ('M0048', 'Lily', 'Fleury', 'lily.fleury@test.com', '0689012359', 'suspended', '1961-10-21', '159 Boulevard de l\'Empereur, Bruxelles', false),
  ('M0049', 'Nolan', 'Colin', 'nolan.colin@test.com', '0690123460', 'suspended', '1960-06-13', '260 Rue de Flandre, Bruxelles', false),
  ('M0050', 'Emma', 'Picard', 'emma.picard@test.com', '0601234571', 'suspended', '1959-02-04', '371 Chaussée de Louvain, Bruxelles', false)
ON CONFLICT (member_code) DO NOTHING;

-- ============================================================================
-- SECTION 3: ASSOCIATION AUX DISCIPLINES
-- ============================================================================

-- Associer les membres actifs à différentes disciplines
-- Boxe Thaï (15 membres)
INSERT INTO public.member_disciplines (member_id, discipline_id)
SELECT m.id, d.id
FROM public.members m
CROSS JOIN public.disciplines d
WHERE m.member_code IN ('M0001', 'M0002', 'M0003', 'M0004', 'M0005', 'M0006', 'M0007', 'M0008', 'M0009', 'M0010', 'M0011', 'M0012', 'M0013', 'M0014', 'M0015')
AND d.slug = 'boxe-thai'
ON CONFLICT DO NOTHING;

-- Boxe Anglaise (10 membres)
INSERT INTO public.member_disciplines (member_id, discipline_id)
SELECT m.id, d.id
FROM public.members m
CROSS JOIN public.disciplines d
WHERE m.member_code IN ('M0016', 'M0017', 'M0018', 'M0019', 'M0020', 'M0021', 'M0022', 'M0023', 'M0024', 'M0025')
AND d.slug = 'boxe-anglaise'
ON CONFLICT DO NOTHING;

-- Muay Thai (5 membres)
INSERT INTO public.member_disciplines (member_id, discipline_id)
SELECT m.id, d.id
FROM public.members m
CROSS JOIN public.disciplines d
WHERE m.member_code IN ('M0026', 'M0027', 'M0028', 'M0029', 'M0030')
AND d.slug = 'muay-thai'
ON CONFLICT DO NOTHING;

-- Kick Boxing (5 membres)
INSERT INTO public.member_disciplines (member_id, discipline_id)
SELECT m.id, d.id
FROM public.members m
CROSS JOIN public.disciplines d
WHERE m.member_code IN ('M0031', 'M0032', 'M0033', 'M0034', 'M0035')
AND d.slug = 'kick-boxing'
ON CONFLICT DO NOTHING;

-- Membres multi-disciplines (quelques uns font plusieurs disciplines)
INSERT INTO public.member_disciplines (member_id, discipline_id)
SELECT m.id, d.id
FROM public.members m
CROSS JOIN public.disciplines d
WHERE m.member_code IN ('M0003', 'M0007', 'M0011')
AND d.slug = 'muay-thai'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 4: CRÉATION DES ABONNEMENTS
-- ============================================================================

-- Créer des abonnements pour les membres actifs
INSERT INTO public.subscriptions (member_id, plan_name, price_cents, starts_at, ends_at, status)
SELECT
  m.id,
  'Abonnement Mensuel',
  5000, -- 50 EUR
  CURRENT_DATE - INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '20 days',
  'active'
FROM public.members m
WHERE m.status = 'active'
AND m.member_code BETWEEN 'M0001' AND 'M0035';

-- Abonnements expirés pour les membres inactifs
INSERT INTO public.subscriptions (member_id, plan_name, price_cents, starts_at, ends_at, status)
SELECT
  m.id,
  'Abonnement Mensuel',
  5000,
  CURRENT_DATE - INTERVAL '60 days',
  CURRENT_DATE - INTERVAL '30 days',
  'expired'
FROM public.members m
WHERE m.status = 'inactive';

-- ============================================================================
-- SECTION 5: CRÉATION DES PAIEMENTS
-- ============================================================================

-- Paiements pour les membres actifs (derniers 3 mois)
INSERT INTO public.payments (member_id, subscription_id, amount_cents, currency, method, status, paid_at, memo)
SELECT
  s.member_id,
  s.id,
  5000,
  'EUR',
  CASE (random() * 2)::int
    WHEN 0 THEN 'cash'
    WHEN 1 THEN 'card'
    ELSE 'sepa'
  END,
  'completed',
  CURRENT_DATE - (random() * 90)::int * INTERVAL '1 day',
  'Paiement mensuel'
FROM public.subscriptions s
WHERE s.status = 'active'
AND random() > 0.3; -- 70% des abonnements ont un paiement

-- Quelques paiements en attente
INSERT INTO public.payments (member_id, amount_cents, currency, method, status, paid_at, memo)
SELECT
  m.id,
  5000,
  'EUR',
  'pending',
  'pending',
  NULL,
  'Paiement en attente'
FROM public.members m
WHERE m.status = 'active'
AND m.member_code IN ('M0010', 'M0015', 'M0020');

-- ============================================================================
-- SECTION 6: CRÉATION DES CHECK-INS
-- ============================================================================

-- Check-ins des 30 derniers jours pour les membres actifs
INSERT INTO public.checkins (member_id, scanned_at, location, source)
SELECT
  m.id,
  CURRENT_DATE - (random() * 30)::int * INTERVAL '1 day' + (random() * 24)::int * INTERVAL '1 hour',
  'Entrée principale',
  CASE (random() * 2)::int
    WHEN 0 THEN 'rfid'
    ELSE 'manual'
  END
FROM public.members m
CROSS JOIN generate_series(1, 3) -- 3 check-ins par membre
WHERE m.status = 'active'
AND m.member_code BETWEEN 'M0001' AND 'M0030';

-- ============================================================================
-- SECTION 7: VÉRIFICATION FINALE
-- ============================================================================

-- Compter les membres
SELECT 'Membres totaux' as type, COUNT(*) as count FROM public.members
UNION ALL
SELECT 'Membres actifs', COUNT(*) FROM public.members WHERE status = 'active'
UNION ALL
SELECT 'Membres inactifs', COUNT(*) FROM public.members WHERE status = 'inactive'
UNION ALL
SELECT 'Membres suspendus', COUNT(*) FROM public.members WHERE status = 'suspended';

-- Compter les associations
SELECT 'Associations membre-discipline' as type, COUNT(*) as count FROM public.member_disciplines;

-- Compter les abonnements
SELECT 'Abonnements actifs' as type, COUNT(*) as count FROM public.subscriptions WHERE status = 'active'
UNION ALL
SELECT 'Abonnements expirés', COUNT(*) FROM public.subscriptions WHERE status = 'expired';

-- Compter les paiements
SELECT 'Paiements complétés' as type, COUNT(*) as count FROM public.payments WHERE status = 'completed'
UNION ALL
SELECT 'Paiements en attente', COUNT(*) FROM public.payments WHERE status = 'pending';

-- Compter les check-ins
SELECT 'Check-ins totaux' as type, COUNT(*) as count FROM public.checkins;

-- Tester la vue members_directory_view
SELECT 'Vue members_directory_view' as test, COUNT(*) as count FROM public.members_directory_view;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
-- Vous pouvez maintenant tester la page Membres dans l'application !
-- ============================================================================
