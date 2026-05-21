import { keyFromToken, splitByGaps } from "@/components/exercises/shared";

interface DrillSourceTextProps {
  text: string;
  activeKey: string;
  activeNumber: number;
}

export function DrillSourceText({ text, activeKey, activeNumber }: DrillSourceTextProps) {
  const normalizedActiveKey = activeKey.toLowerCase();
  const tokens = splitByGaps(text);

  return (
    <p className="passage-text mt-3 whitespace-pre-wrap text-base leading-relaxed">
      {tokens.map((token, index) => {
        const key = keyFromToken(token);
        if (!key) {
          return <span key={index}>{token}</span>;
        }
        if (key === normalizedActiveKey) {
          return (
            <span
              key={index}
              aria-label={`Gap ${activeNumber}, the question you missed`}
              className="mx-1 inline-flex items-baseline gap-1 rounded-md border-2 border-[#A85448] bg-[#A85448]/10 px-2 py-0.5 align-baseline font-bold text-[#A85448]"
            >
              <span className="text-xs">({activeNumber})</span>
              <span>____</span>
            </span>
          );
        }
        return (
          <span
            key={index}
            aria-label="other gap"
            className="mx-1 inline-block min-w-[2.5rem] border-b-2 border-[#DED8CF] text-center text-[#A8A89C]"
          >
            ____
          </span>
        );
      })}
    </p>
  );
}
