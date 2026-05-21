import Link from "next/link";
import { BlobField } from "@/components/ui/BlobField";
import { Card } from "@/components/ui/Card";
import { LogoMark } from "@/components/ui/Logo";
import { PasswordResetRequestForm } from "@/components/PasswordResetRequestForm";

export default function ResetPasswordPage() {
  return (
    <main className="app-page relative flex min-h-screen flex-col overflow-hidden">
      <BlobField
        blobs={[
          { shape: 0, color: "#5D7052", size: 460, top: "-140px", left: "-150px", opacity: 0.18 },
          { shape: 4, color: "#C18C5D", size: 360, bottom: "-140px", right: "-120px", opacity: 0.18 },
        ]}
      />
      <header className="px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Link href="/" className="inline-flex items-center gap-3 border-b-0">
            <LogoMark size={36} />
            <span className="font-display text-xl font-semibold italic text-[#2C2C24]">
              Nexus Work
            </span>
          </Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card shapeIndex={3} className="w-full max-w-md px-8 py-12 md:px-12">
          <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-[#2C2C24] md:text-5xl">
            Reset your password
          </h1>
          <p className="mb-8 text-[#78786C]">
            If your account was created before the latest auth update, use this once to refresh
            your login.
          </p>
          <PasswordResetRequestForm />
          <p className="mt-8 border-t border-dashed border-[#DED8CF] pt-6 text-sm text-[#78786C]">
            Remembered it?{" "}
            <Link href="/login" className="font-bold text-[#5D7052]">
              Back to login
            </Link>
            .
          </p>
        </Card>
      </div>
    </main>
  );
}
