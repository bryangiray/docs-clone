import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { createDocument } from "@/app/actions/documents";
import { DocumentSection } from "@/components/dashboard/document-section";
import { Logo } from "@/components/logo";
import { UploadButton } from "@/components/dashboard/upload-button";
import { UserMenu, UserMenuFallback } from "@/components/auth/user-menu";
import { requireUser } from "@/lib/auth/session";
import { listDocumentsFor } from "@/lib/repositories/documents";
import { listUsers } from "@/lib/repositories/users";
import { getAllowedExtensions } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Dashboard - Docs" };

export default function DashboardPage() {
  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo />
          <span className="text-xl text-gray-700">Docs</span>
        </Link>
        <Suspense fallback={<UserMenuFallback />}>
          <UserMenu />
        </Suspense>
      </header>
      <main className="flex-1">
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard />
        </Suspense>
      </main>
    </>
  );
}

async function Dashboard() {
  const user = await requireUser();
  // Always list documents at request time, never from a prefetched shell.
  await connection();
  const [documents, users, extensions] = await Promise.all([
    listDocumentsFor(user.id),
    listUsers(),
    getAllowedExtensions(),
  ]);
  const owned = documents.filter((doc) => doc.role === "owner");
  const shared = documents.filter((doc) => doc.role !== "owner");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-medium text-gray-900">
          Welcome, {user.name}
        </h1>
        <div className="flex flex-wrap items-start gap-2">
          <UploadButton extensions={extensions} />
          <form action={createDocument}>
            <button
              type="submit"
              className="cursor-pointer rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              + New document
            </button>
          </form>
        </div>
      </div>

      <DocumentSection
        title="Owned by me"
        empty="You haven't created any documents yet. Start one with “New document”."
        documents={owned}
        users={users}
        currentUser={user}
        canDelete
      />
      <DocumentSection
        title="Shared with me"
        empty="Nothing has been shared with you yet."
        documents={shared}
        users={users}
        currentUser={user}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="h-9 w-56 animate-pulse rounded bg-gray-200" />
      <div className="mt-8 h-40 animate-pulse rounded-xl bg-gray-200" />
    </div>
  );
}
