-- Migration 058: Sparkle currency + dream fusion

-- Sparkle balance on users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sparkle_balance integer NOT NULL DEFAULT 10;

-- Sparkle transaction log
CREATE TABLE IF NOT EXISTS public.sparkle_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount      integer NOT NULL,
  reason      text NOT NULL,
  reference_id uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sparkle_tx_user ON sparkle_transactions(user_id, created_at DESC);

-- RLS
ALTER TABLE public.sparkle_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own sparkle transactions" ON sparkle_transactions FOR SELECT USING (user_id = auth.uid());

-- RPC to spend sparkles atomically
CREATE OR REPLACE FUNCTION public.spend_sparkles(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_balance integer;
BEGIN
  -- Lock the row
  SELECT sparkle_balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  IF v_balance < p_amount THEN
    RETURN false;
  END IF;

  UPDATE users SET sparkle_balance = sparkle_balance - p_amount WHERE id = p_user_id;
  INSERT INTO sparkle_transactions (user_id, amount, reason, reference_id)
    VALUES (p_user_id, -p_amount, p_reason, p_reference_id);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spend_sparkles(uuid, integer, text, uuid) TO authenticated;

-- RPC to grant sparkles
CREATE OR REPLACE FUNCTION public.grant_sparkles(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE users SET sparkle_balance = sparkle_balance + p_amount WHERE id = p_user_id;
  INSERT INTO sparkle_transactions (user_id, amount, reason)
    VALUES (p_user_id, p_amount, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_sparkles(uuid, integer, text) TO authenticated;
