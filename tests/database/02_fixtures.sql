-- Synthetic data the Playwright tests rely on. Tests assert exact counts
-- against these rows (see tests/public-database), so update both together.

INSERT INTO whisky_journal (
  last_edited, whisky_id, name, distillery, country_region, age, grain, abv, rating, price, notes
) VALUES
  ('2024-11-24', '33675c13-6835-4cc8-b7de-2823b37ae78a', 'Talisker 10 Year Old', 'Talisker', 'Island - Scotland', 10, 'Single malt', 45.8, 5, 2, 'Peppery and smoky'),
  ('2024-11-24', uuid_generate_v4(), 'Johnnie Walker Black Label', 'Johnnie Walker', 'Mixed - Scotland', 12, 'Blend', 40.0, 3, 2, 'Reliable mixer'),
  ('2024-12-01', uuid_generate_v4(), 'Redbreast 12 Year Old', 'Redbreast', 'Ireland', 12, 'Single pot still', 40.0, 4, 3, 'Sherry and spice');

INSERT INTO film_list (name, release_year, top_30, watched, not_in_jar) VALUES
  ('Seven Samurai', '1954', true, true, false),
  ('Final Destination', '2000', false, true, false),
  ('The Godfather', '1972', true, false, false),
  ('Paddington 2', '2017', false, false, true);

INSERT INTO chopin_liszt (chopin_text, checked) VALUES
  ('Limes', false),
  ('Tonic water', true);
