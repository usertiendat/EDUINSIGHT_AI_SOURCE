import { redirect } from "next/navigation";

// The unified login gateway is the single entry point for every role.
export default function LegacyStudentLoginRedirect() {
  redirect("/login");
}
