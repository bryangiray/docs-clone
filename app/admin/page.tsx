import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddUserForm } from "@/components/admin/add-user-form";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { ExtensionsForm } from "@/components/admin/extensions-form";
import { listUsers } from "@/lib/repositories/users";
import { getAllowedExtensions } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Admin - Docs" };

export default function AdminPage() {
  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo />
          <span className="text-xl text-gray-700">Docs</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            Admin
          </span>
        </Link>
        <Link href="/sign-in" className="text-sm text-blue-600 hover:underline">
          Sign in
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-xl font-medium text-gray-900">Users</h1>
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Add a user</h2>
          <AddUserForm />
        </section>
        <Suspense
          fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-200" />}
        >
          <UserList />
        </Suspense>

        <h1 className="mt-10 text-xl font-medium text-gray-900">Uploads</h1>
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-gray-700">
            Allowed file extensions
          </h2>
          <Suspense
            fallback={<div className="h-24 animate-pulse rounded-lg bg-gray-100" />}
          >
            <UploadSettings />
          </Suspense>
        </section>
      </main>
    </>
  );
}

async function UploadSettings() {
  await connection();
  const value = (await getAllowedExtensions()).join("|");
  return <ExtensionsForm current={value} />;
}

async function UserList() {
  await connection();
  const users = await listUsers();
  return (
    <section className="mt-6">
      <h2 className="text-sm font-medium text-gray-700">
        All users <span className="font-normal text-gray-500">({users.length})</span>
      </h2>
      <ul className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
          >
            <Avatar user={user} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
              {user.name}
            </span>
            <span className="text-sm text-gray-500">{user.username}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
