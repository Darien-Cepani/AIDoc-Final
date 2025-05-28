
import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/50 p-4">
      <div className="flex w-full justify-center items-center flex-col">
        <div className="mb-1 flex justify-center">
        <Logo />
      </div>
        {children}
      </div>
    </div>
  );
}
