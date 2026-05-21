import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { signupAction } from "@/app/(auth)/actions";
import { BlobField } from "@/components/ui/BlobField";
import { Card } from "@/components/ui/Card";
import { LogoMark } from "@/components/ui/Logo";

export default function SignupPage() {
  return (
    <main className="app-page min-h-screen relative overflow-hidden flex flex-col">
      <BlobField
        blobs={[
          { shape: 1, color: "#5D7052", size: 460, top: "-140px", right: "-140px", opacity: 0.18 },
          { shape: 3, color: "#E6DCCD", size: 420, bottom: "-180px", left: "-140px", opacity: 0.5 },
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
        <Card shapeIndex={2} className="w-full max-w-md px-8 md:px-12 py-12">
          <AuthForm
            title="Create an account"
            submitLabel="Sign up"
            action={signupAction}
            passwordAutoComplete="new-password"
          />
          <p className="mt-8 pt-6 border-t border-dashed border-[#DED8CF] text-sm text-[#78786C]">
            Already registered?{" "}
            <Link href="/login" className="font-bold text-[#5D7052]">
              Log in
            </Link>
            .
          </p>
        </Card>
      </div>
    </main>
  );
}
