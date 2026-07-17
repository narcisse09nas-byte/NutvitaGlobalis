import { Card } from "@/components/ui/Card";

export function ExamQuestionCard({
  index,
  question,
  selected,
  submitted,
  onSelect,
}: {
  index: number;
  question: {
    question: string;
    options: string[];
    answer: number;
  };
  selected?: number;
  submitted: boolean;
  onSelect: (optionIndex: number) => void;
}) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-[#063D2E]">Question {index + 1}</h2>

      <p className="mt-3 font-semibold text-slate-700">{question.question}</p>

      <div className="mt-5 space-y-3">
        {question.options.map((option, optionIndex) => {
          const isSelected = selected === optionIndex;
          const isCorrect = submitted && optionIndex === question.answer;
          const isWrong =
            submitted && isSelected && optionIndex !== question.answer;

          return (
            <button
              key={option}
              onClick={() => !submitted && onSelect(optionIndex)}
              className={`w-full rounded-2xl border p-4 text-left text-sm transition ${
                isCorrect
                  ? "border-green-500 bg-green-50 text-green-800"
                  : isWrong
                    ? "border-red-500 bg-red-50 text-red-800"
                    : isSelected
                      ? "border-[#0B5D3B] bg-[#DDF5E8] font-bold text-[#063D2E]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
