import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CreateBusinessPayload = {
  business_name?: string;
  email?: string;
  password?: string;
};

function slugifyUsername(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return (normalized || 'business').slice(0, 24);
}

function normalizeBusinessName(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

function toBusinessUsernameCandidate(input: string) {
  const slug = slugifyUsername(input);
  const withPrefix = `biz_${slug}`;
  return withPrefix.length <= 24 ? withPrefix : slug;
}

function isEmailTakenError(error: { message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase();
  return message.includes('already') && (message.includes('registered') || message.includes('exists') || message.includes('been taken'));
}

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

    const { data: ownerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !ownerProfile) {
      return new Response(JSON.stringify({ error: 'Profile not found.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await request.json()) as CreateBusinessPayload;
    const businessName = payload.business_name?.trim() ?? '';
    const email = payload.email?.trim().toLowerCase() ?? '';
    const password = payload.password?.trim() ?? '';

    if (!businessName || !email || !password) {
      return new Response(JSON.stringify({ error: 'Business name, email, and password are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const businessNameNormalized = normalizeBusinessName(businessName);
    const usernameCandidate = toBusinessUsernameCandidate(businessName);

    const { data: existingBusinessLink } = await adminClient
      .from('linked_accounts')
      .select('id,owner_profile_id,linked_profile_id')
      .eq('relationship_type', 'business')
      .eq('business_name_normalized', businessNameNormalized)
      .maybeSingle();

    if (existingBusinessLink?.id) {
      if (existingBusinessLink.owner_profile_id === ownerProfile.id) {
        return new Response(JSON.stringify({ error: 'Business account already linked.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: requestError } = await adminClient.from('business_account_access_requests').insert({
        target_profile_id: existingBusinessLink.linked_profile_id,
        requester_profile_id: ownerProfile.id,
      });

      if (requestError && requestError.code !== '23505') {
        return new Response(JSON.stringify({ error: 'Business account exists, but access request could not be sent.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        code: 'BUSINESS_NAME_EXISTS',
        error: requestError?.code === '23505'
          ? 'An access request is already pending for this business account.'
          : 'Business account exists. Access request has been sent.',
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: businessName,
        username: usernameCandidate,
      },
    });

    const createdUserId: string | null = createdUser?.user?.id ?? null;

    // An email that is already registered belongs to someone else's account (or one the caller must
    // sign in to). Never adopt it here: renaming and linking it would hand the caller that account.
    if (!createdUserId && isEmailTakenError(createError)) {
      return new Response(JSON.stringify({ code: 'EMAIL_TAKEN', error: 'This email is already registered. Sign in to that account to connect it.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!createdUserId) {
      return new Response(JSON.stringify({ error: createError?.message || 'Could not create business account.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let linkedProfileId: string | null = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data, error } = await adminClient
        .from('profiles')
        .select('id, username, full_name')
        .eq('user_id', createdUserId)
        .maybeSingle();

      if (!error && data?.id) {
        linkedProfileId = data.id;
        const nextUsername = data.username?.trim() ? data.username : usernameCandidate;
        if (data.full_name !== businessName || nextUsername !== data.username) {
          await adminClient
            .from('profiles')
            .update({
              full_name: businessName,
              username: nextUsername,
            })
            .eq('id', data.id);
        }
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (!linkedProfileId) {
      return new Response(JSON.stringify({ error: 'Could not link business profile.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: linkError } = await adminClient.from('linked_accounts').insert({
      owner_profile_id: ownerProfile.id,
      linked_profile_id: linkedProfileId,
      relationship_type: 'business',
      business_name_normalized: businessNameNormalized,
    });

    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        linked_profile_id: linkedProfileId,
        email,
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
