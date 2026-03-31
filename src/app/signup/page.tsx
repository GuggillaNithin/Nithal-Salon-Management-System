import { redirect } from "next/navigation";

export default function SignupRedirect() {
  // We no longer have a public signup page. 
  // Tenant registration happens via the superadmin control panel.
  redirect("/");
}
