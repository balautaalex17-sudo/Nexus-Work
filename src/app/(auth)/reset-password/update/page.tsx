import Link from "next/link";
import { BlobField } from "@/components/ui/BlobField";
import { Card } from "@/components/ui/Card";
import { LogoMark } from "@/components/ui/Logo";
import { UpdatePasswordForm } from "@/components/UpdatePasswordForm";

export default function UpdatePasswordPage() {
  return (
    <main className="app-page relative flex min-h-screen flex-col overflow-hidden">
      <BlobField
        blobs={[
          { shape: 1, color: "#5D7052", size: 440, top: "-140px", right: "-150px", opacity: 0.18 },
          { shape: 3, color: "#E6DCCD", size: 420, bottom: "-180px", left: "-140px", opacity: 0.5 },
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
        <Card shapeIndex={2} className="w-full max-w-md px-8 py-12 md:px-12">
          <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-[#2C2C24] md:text-5xl">
            Choose a new password
          </h1>
          <p className="mb-8 text-[#78786C]">
            Use at least 8 characters. After the update, you can log in again with the new
            password.
          </p>
          <UpdatePasswordForm />
        </Card>
      </div>
    </main>
  );
}
