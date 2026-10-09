import { redirect } from "next/navigation";

// The mock tests section lives at /mock-tests
export default function PracticeMockTestsRedirect() {
  redirect("/mock-tests");
}
