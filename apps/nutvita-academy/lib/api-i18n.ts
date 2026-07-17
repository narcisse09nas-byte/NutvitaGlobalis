export function apiText(request: Request, fr: string, en: string) {
  const language = request.headers.get("accept-language")?.toLowerCase() ?? "fr";
  return language.startsWith("en") ? en : fr;
}
