import type { Metadata } from "next";

import { MockTestCatalog } from "@/features/mock-tests/components/mock-test-catalog";
import { getMockTestCatalog } from "@/features/mock-tests/server/content";

export const metadata: Metadata = { title: "Mock tests" };

export default async function MockTestsPage() {
  return <MockTestCatalog tests={await getMockTestCatalog()} />;
}
