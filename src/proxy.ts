import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/results",
  "/updates",
  "/changes",
  "/flightbooks",
  "/search",
  "/training",
  "/history",
  "/notifications",
  "/settings",
  "/profile",
];

const BILLING_ALLOWED_PREFIXES = ["/settings", "/subscription-locked"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    copyCookies(response, redirect);
    return redirect;
  }

  if (pathname === "/login" && user) {
    const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
    copyCookies(response, redirect);
    return redirect;
  }

  if (user && serviceRoleKey && isProtectedPath(pathname)) {
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: orgUser } = await admin
      .from("org_users")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (orgUser?.organization_id) {
      const { data: subscription } = await admin
        .from("organization_subscriptions")
        .select("billing_state")
        .eq("organization_id", orgUser.organization_id)
        .maybeSingle();

      const allowedDuringSuspension = BILLING_ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );

      if (subscription?.billing_state === "suspended" && !(orgUser.role === "admin" && allowedDuringSuspension)) {
        const lockedUrl = new URL("/subscription-locked", request.url);
        const redirect = NextResponse.redirect(lockedUrl);
        copyCookies(response, redirect);
        return redirect;
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
