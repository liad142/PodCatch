CREATE OR REPLACE FUNCTION count_distinct_players()
RETURNS bigint AS $$
  SELECT COUNT(DISTINCT user_id) FROM play_events WHERE user_id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;
