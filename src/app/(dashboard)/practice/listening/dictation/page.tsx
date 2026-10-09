import type { Metadata } from "next";
import { getDictationCatalog } from "@/features/dictation/content";
import { DictationCatalog } from "@/features/dictation/components/dictation-catalog";

export const metadata: Metadata = {
  title: "Dictation Practice - Luyện Nghe Chép Chính Tả",
};

export default function DictationCatalogPage() {
  const items = getDictationCatalog();
  return (
    <div className="mx-auto min-h-[100dvh] pb-32 font-sans">
      <DictationCatalog items={items} />
    </div>
  );
}
