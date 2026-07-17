import { useLanguage } from "@/hooks/use-language";

const quickPrompts = [
  { fr: "Qu’est-ce que la malnutrition aiguë ?", en: "What is acute malnutrition?" },
  { fr: "Quelle différence entre MAM et MAS ?", en: "What is the difference between MAM and SAM?" },
  { fr: "Comment interpréter le MUAC ?", en: "How do I interpret MUAC?" },
  { fr: "Comment rechercher les œdèmes bilatéraux ?", en: "How do I check for bilateral oedema?" },
  { fr: "Comment réviser après un échec au quiz ?", en: "How should I review after failing a quiz?" },
];

export function AiQuickPrompts({
  onSelect,
}: {
  onSelect: (
    prompt: string
  ) => void;
}) {
  const { locale } = useLanguage();
  return (
    <div className="flex flex-wrap gap-2">
      {quickPrompts.map(
        (prompt) => (
          <button
            key={prompt.fr}
            type="button"
            onClick={() =>
              onSelect(prompt[locale])
            }
            className="rounded-full border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#DDF5E8]"
          >
            {prompt[locale]}
          </button>
        )
      )}
    </div>
  );
}
