import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/types";
import { PostForm } from "@/components/admin/post-form";

export default async function EditPostPage(props: PageProps<"/admin/blog/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: post } = await supabase.from("blog_posts").select("*").eq("id", id).single();
  if (!post) notFound();

  return (
    <div>
      <Link href="/admin/blog" className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 font-display text-3xl text-ink">Editar artigo</h1>
      <PostForm post={post as BlogPost} />
    </div>
  );
}
