import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostForm } from "@/components/admin/post-form";

export default function NewPostPage() {
  return (
    <div>
      <Link href="/admin/blog" className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 font-display text-3xl text-ink">Novo artigo</h1>
      <PostForm />
    </div>
  );
}
