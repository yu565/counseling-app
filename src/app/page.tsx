import { createServer } from "@/lib/supabase/serverClient";

export default async function Home() {
  const supabase = await createServer(); // ★ ここを await にする
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <main className="max-w-screen-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">ホーム</h1>
      <p className="text-gray-600">
        {session ? `ログイン中：${session.user.email}` : "未ログイン"}
      </p>
      <p>
        <a href="/booking" className="underline">予約ページへ</a>
      </p>
    </main>
  );
}
