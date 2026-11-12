import { LoginForm } from "@/components/features/auth/LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { notice } = await searchParams;
  return <LoginForm notice={notice === "registered" || notice === "passwordUpdated" ? notice : undefined} />;
}
