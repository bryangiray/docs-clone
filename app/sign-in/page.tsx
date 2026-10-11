import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { SignInForm } from "@/components/sign-in-form";
import { listUsers } from "@/lib/db";

export const metadata: Metadata = { title: "Sign in - Docs" };

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <Logo size={48} />
        </div>
        <h1 className="mt-4 text-2xl font-medium text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">to continue to Docs</p>
        <Suspense
          fallback={<div className="mt-6 h-40 animate-pulse rounded-lg bg-gray-100" />}
        >
          <Accounts />
        </Suspense>
        <p className="mt-6 text-sm text-gray-600">
          Need another account?{" "}
          <Link href="/admin" className="text-blue-600 hover:underline">
            Add a user
          </Link>
        </p>
      </div>
    </main>
  );
}

async function Accounts() {
  await connection();
  return <SignInForm users={await listUsers()} />;
}
