import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { formatDateTime } from "@/lib/format";
import type { DocumentSummary, User } from "@/lib/types";
import { DeleteDocumentButton } from "./delete-document-button";

export function DocumentSection({
  title,
  empty,
  documents,
  users,
  currentUser,
  canDelete = false,
}: {
  canDelete?: boolean;
  title: string;
  empty: string;
  documents: DocumentSummary[];
  users: User[];
  currentUser: User;
}) {
  const nameOf = (id: number | null) =>
    id === currentUser.id
      ? "me"
      : (users.find((user) => user.id === id)?.name ?? "unknown");

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-gray-700">
        {title}{" "}
        <span className="font-normal text-gray-500">({documents.length})</span>
      </h2>
      {documents.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-8 text-center text-sm text-gray-600">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <li
            className={`hidden grid-cols-[1fr_11rem_15rem] gap-4 border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:grid ${
              canDelete ? "sm:pr-14" : ""
            }`}
          >
            <span>Name</span>
            <span>Owner</span>
            <span>Last edited</span>
          </li>
          {documents.map((doc) => {
            const owner = users.find((user) => user.id === doc.ownerId);
            return (
              <li
                key={doc.id}
                className="flex items-center border-b border-gray-100 transition last:border-b-0 hover:bg-blue-50 has-data-pending:opacity-40"
              >
                <Link
                  href={`/d/${doc.id}`}
                  className="grid min-w-0 flex-1 grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1fr_11rem_15rem] sm:items-center sm:gap-4"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Logo size={24} />
                    <span className="truncate text-sm font-medium text-gray-900">
                      {doc.title}
                    </span>
                    {doc.docType !== "rich-text" && (
                      <span
                        title={`Uploaded from a .${doc.docType} file`}
                        className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-blue-700"
                      >
                        {doc.docType}
                      </span>
                    )}
                    {doc.role !== "owner" && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {doc.role === "editor" ? "Can edit" : "View only"}
                      </span>
                    )}
                  </span>
                  <span className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
                    {owner && <Avatar user={owner} size={20} />}
                    <span className="truncate">{nameOf(doc.ownerId)}</span>
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatDateTime(doc.updatedAt)}
                    {doc.updatedBy !== null && ` · ${nameOf(doc.updatedBy)}`}
                  </span>
                </Link>
                {canDelete && (
                  <DeleteDocumentButton id={doc.id} title={doc.title} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
