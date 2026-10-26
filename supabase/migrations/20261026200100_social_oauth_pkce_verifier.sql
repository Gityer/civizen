-- Security finding L3 (job jd253bc24): the X PKCE verifier was derived from the public OAuth state value, so PKCE
-- added nothing. Each X authorization now stores a random verifier with its single-use state row; the authorize URL
-- carries only its S256 challenge.
ALTER TABLE public.social_oauth_states ADD COLUMN IF NOT EXISTS code_verifier text;
