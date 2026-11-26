-- ===========================================================================
-- Forum — voorbeeldteksten in gewone taal (minder "AI-praat")
--
-- Past ALLEEN de voorbeeld-rijen uit 0001 aan, en alleen als die nog precies
-- de oude tekst hebben. Eigen nieuws, topics en chat blijven onaangeroerd.
-- Idempotent: mag meerdere keren gedraaid worden.
-- ===========================================================================

-- Nieuws
update public.news set
  title = 'Het forum heeft een eigen plek gekregen',
  summary = 'Alles staat nu onder /forum. Ook nieuw: punten als je anderen helpt, en je kunt tabellen en plaatjes in je posts zetten.'
where slug = 'forum-verplaatst-badges-tabellen-bijlagen'
  and title = 'Forum verplaatst naar /forum + Badges, Tabellen & Bijlagen live';

update public.news set
  title = 'Zoeken werkt nu overal',
  summary = 'Druk op / of Ctrl+K en zoek in één keer door topics, nieuws en projecten. In de chat kun je nu ook meldingen aanzetten.'
where slug = 'globale-zoekbalk-achtergrondmeldingen'
  and title = 'Globale zoekbalk & achtergrondmeldingen voor Live chat toegevoegd';

update public.news set
  title = 'Je kunt nu code en projecten delen',
  summary = 'Plak code in je topic en het wordt netjes opgemaakt. In de galerij laat je zien wat je gemaakt hebt.'
where slug = 'code-snippets-project-galerij'
  and title = 'Nieuw: Code-snippets & Project-galerij met live previews gelanceerd';

update public.news set
  title = 'Jullie kiezen wat we hierna bouwen',
  summary = 'Elke week een korte peiling. Plus een eerlijke update over wat de server kost en hoeveel er al binnen is.'
where slug = 'community-peiling-supporter-doelen'
  and title = 'Community Peiling & Supporter-doelen voor dit kwartaal';

-- Welkomsttopic
update public.topics set
  title = 'Welkom! Lees dit even als je nieuw bent',
  excerpt = 'Hoe het forum werkt, waar je wat vindt en een paar huisregels. Kort, beloofd.',
  body = E'Hoi allemaal!\n\nLeuk dat je er bent. Een paar dingen om te weten:\n• Vragen stellen mag altijd, ook als je denkt dat het een domme vraag is.\n• Help je iemand, dan krijg je punten en soms een badge. Leuk, maar geen wedstrijd.\n• In je posts kun je code, tabellen en plaatjes zetten.\n\nStel je gerust even voor in de chat onderaan. Tot zo!\n\n— Sander'
where author_id is null
  and title = 'Welkom op het vernieuwde /forum — badges, tabellen & bijlagen staan live!';

-- Chat
update public.chat_messages set body = 'Goeiemorgen allemaal ☕ Het forum staat nu op /forum, laat maar weten als er iets raar doet.'
where user_id is null
  and body = 'Goedemorgen! Het forum staat nu netjes op /forum en badges + Markdown-tabellen zijn geactiveerd.';

update public.chat_messages set body = 'Ziet er goed uit! Fijn dat je nu ook punten krijgt als je iemand helpt.'
where user_id is null
  and body = 'Ziet er superstrak uit! Vooral fijn dat helpers nu ook punten krijgen bij beste antwoorden.';

update public.chat_messages set body = 'Die tabel in het topic van Nora leest echt een stuk makkelijker trouwens.'
where user_id is null
  and body = 'Die vergelijkingstabel in het React + Vue topic van Nora leest echt tien keer makkelijker zo.';

-- Peiling
update public.polls set question = 'Wat moeten we hierna bouwen?'
where question = 'Wat bouwen we hierna? Kies de volgende functie voor het forum.';

update public.poll_options set label = 'Privéberichten'
where label = 'Privéberichten & directe @mentions met meldingen';

update public.poll_options set label = 'Topics opslaan voor later'
where label = 'Bladwijzers & opgeslagen topics in je profiel';

update public.poll_options set label = 'Een wekelijkse code-uitdaging'
where label = 'Wekelijkse code-challenges met speciale badges';

update public.poll_options set label = 'Beter zoeken (op tag, auteur of datum)'
where label = 'Geavanceerd zoeken op tags, auteur en datum';
