import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin (you can customize this condition)
  const isAdmin = 
    user.user_metadata?.role === 'admin' || 
    user.email === 'admin@example.com' || 
    user.email === process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white shadow-xl">
        <div className="flex h-16 items-center px-6 text-xl font-bold border-b border-gray-800">
          IELTS Admin
        </div>
        <div className="px-4 py-6">
          <ul className="space-y-2 font-medium">
            <li>
              <a
                href="/admin/content"
                className="flex items-center rounded-lg bg-indigo-600 px-4 py-3 text-white transition-all hover:bg-indigo-700 shadow"
              >
                <svg className="w-5 h-5 mr-3 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                AI Content Review
              </a>
            </li>
          </ul>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
