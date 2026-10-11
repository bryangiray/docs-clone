import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DocumentEditor } from "@/components/document-editor";
import { Logo } from "@/components/logo";
import { UserMenu, UserMenuFallback } from "@/components/user-menu";
import { getDocumentFor, listActivity, listShares, listUsers } from "@/lib/db";
import { requireUser } from "@/lib/session";

const MAX_ID = 2147483647;

export default function DocumentPage({ params }: PageProps<"/d/[id]">) {
  return (
    <Suspense fallback={<DocumentSkeleton />}>
      <DocumentLoader params={params} />
    </Suspense>
  );
}

async function DocumentLoader({
  params,
}: Pick<PageProps<"/d/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();

  const docId = Number(id);
  if (!Number.isInteger(docId) || docId < 1 || docId > MAX_ID) notFound();

  // Always read the document at request time, never from a prefetched shell.
  await connection();
  const doc = await getDocumentFor(docId, user.id);
  if (!doc) notFound();

  if (!doc.role) {
    return (
      <>
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo />
            <span className="text-xl text-gray-700">Docs</span>
          </Link>
          <UserMenu />
        </header>
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-xl font-medium text-gray-900">
            You don&apos;t have access to this document
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Ask the owner to share it with {user.username}.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to dashboard
          </Link>
        </main>
      </>
    );
  }

  const [users, shares, activity] = await Promise.all([
    listUsers(),
    listShares(doc.id),
    listActivity(doc.id),
  ]);

  return (
    <DocumentEditor
      // Previous pages stay mounted while hidden, so remount whenever the
      // saved copy, the viewer or their permission differs from what's on screen.
      key={`${doc.id}:${user.id}:${doc.role}:${doc.updatedAt}`}
      doc={{
        id: doc.id,
        title: doc.title,
        content: doc.content,
        ownerId: doc.ownerId,
      }}
      role={doc.role}
      users={users}
      initialShares={shares}
      initialActivity={activity}
      currentUserId={user.id}
      userMenu={<UserMenu />}
    />
  );
}

function DocumentSkeleton() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Logo />
          <div className="h-6 w-56 animate-pulse rounded bg-gray-200" />
        </div>
        <UserMenuFallback />
      </header>
      <div className="mx-auto mt-6 h-[70vh] w-full max-w-[816px] animate-pulse bg-white shadow" />
    </>
  );
}
