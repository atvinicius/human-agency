-- Auto-grant $10 to new users on signup (beta tester credits)
CREATE OR REPLACE FUNCTION grant_beta_credits()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 10.00, 10.00)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO credit_transactions (user_id, amount, type, source, description, balance_after)
  VALUES (NEW.id, 10.00, 'grant', 'beta-welcome', 'Beta tester welcome credits', 10.00);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_grant_credits ON auth.users;
CREATE TRIGGER on_user_created_grant_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION grant_beta_credits();
