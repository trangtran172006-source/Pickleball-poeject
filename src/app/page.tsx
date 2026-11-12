import { redirect } from "next/navigation";

/** Entry point. Role-based redirect for signed-in users is added with the back end. */
export default function Page() {
  redirect("/login");
}
