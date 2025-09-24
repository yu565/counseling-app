import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // @supabase/ssr の createServerClient を middleware でも使用
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // middleware では res.cookies.set を使う
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = new URL(req.url);

  // 認証不要ページ
  const publicRoutes = [
    "/login",
    "/signup",
    "/logout",
    "/_next",
    "/api",
    "/favicon.ico",
    "/next.svg",
    "/vercel.svg",
  ];
  const isPublic = publicRoutes.some((p) => pathname.startsWith(p));

  // 未ログインで保護ページ→/login
  if (!session && !isPublic) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ログイン済みで /login or /signup → /
  if (session && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

// 監視対象（保護したい）ルート
export const config = {
  matcher: ["/", "/booking", "/booking/:path*"],
};
