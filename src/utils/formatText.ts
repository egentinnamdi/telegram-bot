export function escapeMarkdownV2(text: string) {
  return (
    text
      .replaceAll("_", "\\_")
      // .replaceAll("*", "\\*")
      .replaceAll("[", "\\[")
      .replaceAll("]", "\\]")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
      .replaceAll("~", "\\~")
      .replaceAll("`", "\\`")
      .replaceAll(">", "\\>")
      .replaceAll("#", "\\#")
      .replaceAll("+", "\\+")
      .replaceAll("-", "\\-")
      .replaceAll("=", "\\=")
      .replaceAll("|", "\\|")
      .replaceAll("{", "\\{")
      .replaceAll("}", "\\}")
      .replaceAll(".", "\\.")
      .replaceAll("!", "\\!")
  );
}
