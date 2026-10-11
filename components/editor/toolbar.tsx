"use client";

import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor && {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        block: editor.isActive("heading", { level: 1 })
          ? "1"
          : editor.isActive("heading", { level: 2 })
            ? "2"
            : editor.isActive("heading", { level: 3 })
              ? "3"
              : "p",
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      },
  });

  const disabled = !editor || !state;

  function setBlock(value: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "p") chain.setParagraph().run();
    else chain.setHeading({ level: Number(value) as 1 | 2 | 3 }).run();
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="mx-3 mb-2 flex flex-wrap items-center gap-1 rounded-full bg-[#edf2fa] px-3 py-1"
    >
      <ToolButton
        label="Undo (⌘Z)"
        disabled={disabled || !state.canUndo}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        <Icon d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
      </ToolButton>
      <ToolButton
        label="Redo (⌘⇧Z)"
        disabled={disabled || !state.canRedo}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        <Icon d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
      </ToolButton>
      <Divider />
      <select
        aria-label="Text style"
        value={state?.block ?? "p"}
        disabled={disabled}
        onChange={(event) => setBlock(event.target.value)}
        className="h-8 cursor-pointer rounded px-2 text-sm text-gray-800 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <option value="p">Normal text</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>
      <Divider />
      <ToolButton
        label="Bold (⌘B)"
        active={state?.bold}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton
        label="Italic (⌘I)"
        active={state?.italic}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <span className="font-serif italic">I</span>
      </ToolButton>
      <ToolButton
        label="Underline (⌘U)"
        active={state?.underline}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolButton>
      <Divider />
      <ToolButton
        label="Bulleted list"
        active={state?.bulletList}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={state?.orderedList}
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <Icon d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5v4M4 8.5h3M4 14.5h3l-3 4h3" />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the text selection in the document when the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm text-gray-800 disabled:cursor-default disabled:opacity-40 ${
        active ? "bg-blue-200 text-blue-900" : "hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-gray-300" />;
}
