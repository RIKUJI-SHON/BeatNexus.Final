-- Create the pre_registered_users table
CREATE TABLE public.pre_registered_users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT pre_registered_users_pkey PRIMARY KEY (id),
    CONSTRAINT pre_registered_users_email_key UNIQUE (email)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pre_registered_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow full access for service_role
-- This policy ensures that only backend services (like Edge Functions)
-- with the service_role key can access this table.
CREATE POLICY "Allow full access for service_role"
ON public.pre_registered_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment on table
COMMENT ON TABLE public.pre_registered_users IS 'Stores email addresses of users who are allowed to register during the pre-release period.'; 