"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function approveContent(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("ai_generated_contents")
    .update({ status: "APPROVED" })
    .eq("id", id);

  revalidatePath("/admin/content");
}

export async function rejectContent(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("ai_generated_contents")
    .update({ status: "REJECTED" })
    .eq("id", id);

  revalidatePath("/admin/content");
}
