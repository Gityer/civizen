import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CreateUserPayload = {
  email?: string;
  password?: string;
  full_name?: string | null;
  username?: string | null;
  role?: string;
};

import { resolveRequestedRole } from './authorize.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = request.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: effectivePermissions, error: permissionsError } = await userClient.rpc(
      'current_app_permissions',
    );
    const canManageUsers = Array.isArray(effectivePermissions)
      && (effectivePermissions as string[]).some(
        (permission) => permission === 'role.assign' || permission === 'settings.manage',
      );

    if (permissionsError || !canManageUsers) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await request.json()) as CreateUserPayload;
    const email = payload.email?.trim();
    const password = payload.password?.trim();

    // The role write below uses the service-role client, which skips the founder-guard trigger, so founder and
    // admin are refused here unless the caller holds founder authority. Checked before the user is created.
    const { data: founderAuthority } = await userClient.rpc('my_founder_authority');
    const decision = resolveRequestedRole(payload.role, founderAuthority === true);
    if (!decision.ok) {
      return new Response(JSON.stringify({ error: decision.error }), {
        status: decision.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const role = decision.role;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name ?? null,
        username: payload.username ?? null,
      },
    });

    if (createError || !createdUser.user) {
      return new Response(JSON.stringify({ error: createError?.message || 'Could not create user.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (role !== 'member') {
      let roleError: Error | null = null;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const { error } = await adminClient
          .from('profiles')
          .update({ role })
          .eq('user_id', createdUser.user.id);

        if (!error) {
          roleError = null;
          break;
        }

        roleError = error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({
        user: {
          id: createdUser.user.id,
          email: createdUser.user.email,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
