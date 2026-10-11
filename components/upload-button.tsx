"use client";

import { startTransition, useActionState, useRef } from "react";
import { uploadDocument } from "@/app/actions";
import type { UploadState } from "@/app/actions";

const INITIAL_STATE: UploadState = {};
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function UploadButton({ extensions }: { extensions: string[] }) {
  const accepted = extensions.map((extension) => `.${extension}`);
  const [state, formAction, isPending] = useActionState(
    uploadDocument,
    INITIAL_STATE,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const formData = new FormData();
    // Oversized files are sent empty so the server replies with its normal
    // error instead of the request being cut off mid-upload.
    formData.set("file", file.size > MAX_UPLOAD_BYTES ? new File([], "") : file);
    if (file.size > MAX_UPLOAD_BYTES) formData.set("tooLarge", "1");
    startTransition(() => formAction(formData));
  }

  return (
    <div className="flex flex-col items-end">
      <input
        ref={inputRef}
        type="file"
        accept={accepted.join(",")}
        onChange={onChange}
        className="hidden"
        aria-label="Upload a document"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        title={`Upload a file (${accepted.join(", ")})`}
        className="cursor-pointer rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-default disabled:opacity-60"
      >
        {isPending ? "Uploading…" : "Upload file"}
      </button>
      {state.error && !isPending && (
        <p role="alert" className="mt-1 max-w-xs text-right text-xs text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
