import { describe, expect, it } from "vitest";
import { converterFor } from "./converters";

const convert = (extension: string, text: string) =>
  converterFor(extension)(Buffer.from(text, "utf8"));

describe("converterFor", () => {
  it("imports plain text as one escaped paragraph per line", async () => {
    expect(await convert("txt", "a < b\r\n\nlast & final")).toBe(
      "<p>a &lt; b</p><p></p><p>last &amp; final</p>",
    );
  });

  it("treats unknown extensions as plain text", async () => {
    expect(await convert("log", "# not a heading")).toBe(
      "<p># not a heading</p>",
    );
  });

  it("keeps Markdown formatting", async () => {
    const html = await convert(
      "md",
      "# Title\n\nSome **bold** text\n\n- one\n- two",
    );
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<li>one</li>");
  });

  it("ignores a byte order mark", async () => {
    expect(await convert("txt", "﻿hello")).toBe("<p>hello</p>");
  });

  it("rejects files that aren't text", async () => {
    const binary = Buffer.from([0x25, 0x50, 0x44, 0x46, 0xff, 0xfe, 0x00]);
    await expect(converterFor("txt")(binary)).rejects.toThrow();
    await expect(
      converterFor("docx")(Buffer.from("not a zip")),
    ).rejects.toThrow();
  });
});
