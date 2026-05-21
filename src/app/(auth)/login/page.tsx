import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/app/(auth)/actions";
import { BlobField } from "@/components/ui/BlobField";
import { Card } from "@/components/ui/Card";
import { LogoMark } from "@/components/ui/Logo";
import { friendlyAuthError } from "@/lib/errors";

interface LoginPageProps {
  searchParams: Promise<{ next?: string; message?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next;
  const notice = params.error ? friendlyAuthError(params.error) : params.message;
  const noticeTone = params.error ? "error" : "neutral";

  return (
    <main className="app-page min-h-screen relative overflow-hidden flex flex-col">
      <BlobField
        blobs={[
          { shape: 0, color: "#5D7052", size: 480, top: "-160px", left: "-160px", opacity: 0.18 },
          { shape: 2, color: "#C18C5D", size: 380, bottom: "-160px", right: "-120px", opacity: 0.16 },
        ]}
      />
      <header className="px-4 sm:px-6 lg:px-8 pt-8">
        <div className="mx-auto w-full max-w-7xl">
          <Link href="/" className="inline-flex items-center gap-3 border-b-0">
            <LogoMark size={36} />
            <span className="font-display italic font-semibold text-xl text-[#2C2C24]">Nexus Work</span>
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card shapeIndex={1} className="w-full max-w-md px-8 md:px-12 py-12">
          <AuthForm
            title="Welcome back"
            submitLabel="Log in"
            action={loginAction}
            next={next}
            notice={notice}
            noticeTone={noticeTone}
          />
          <p className="mt-8 pt-6 border-t border-dashed border-[#DED8CF] text-sm text-[#78786C]">
            No account yet?{" "}
            <Link href="/signup" className="font-bold text-[#5D7052]">
              Create one
            </Link>
            .
          </p>
          <p className="mt-3 text-sm text-[#78786C]">
            Older account or forgotten password?{" "}
            <Link href="/reset-password" className="font-bold text-[#5D7052]">
              Reset your password
            </Link>
            .
          </p>
        </Card>
      </div>
    </main>
  );
}
