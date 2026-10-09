"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { traduzErro, type FormResult } from "@/lib/admin-form";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function savePost(formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();

  const id = (formData.get("id") as string) || null;
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Título obrigatório" };
  let slug = (formData.get("slug") as string)?.trim();
  slug = slug ? slugify(slug) : slugify(title);

  const status = (formData.get("status") as string) === "published" ? "published" : "draft";
  const tags = ((formData.get("tags") as string) || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const record = {
    title,
    slug,
    excerpt: (formData.get("excerpt") as string) || null,
    content: (formData.get("content") as string) || null,
    cover_url: (formData.get("cover_url") as string) || null,
    author: (formData.get("author") as string) || "Aroma Haus",
    tags,
    status,
    seo_title: (formData.get("seo_title") as string) || null,
    seo_description: (formData.get("seo_description") as string) || null,
    published_at:
      status === "published"
        ? (formData.get("published_at") as string) || new Date().toISOString()
        : null,
  };

  if (id) {
    const { error } = await supabase.from("blog_posts").update(record).eq("id", id);
    if (error) return { error: traduzErro(error.message) };
  } else {
    const { error } = await supabase.from("blog_posts").insert(record);
    if (error) return { error: traduzErro(error.message) };
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function deletePost(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blog");
}
