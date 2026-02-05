import React from "react";
import { Text, View } from "react-native";

type Token =
  | { type: "text"; value: string }
  | { type: "fraction"; num: string; den: string };

const FRACTION_RE = /(\d+)\s*\/\s*(\d+)/g;

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FRACTION_RE.exec(input)) !== null) {
    const [full, num, den] = match;
    const start = match.index;
    if (start > lastIndex) {
      tokens.push({ type: "text", value: input.slice(lastIndex, start) });
    }
    tokens.push({ type: "fraction", num, den });
    lastIndex = start + full.length;
  }
  if (lastIndex < input.length) {
    tokens.push({ type: "text", value: input.slice(lastIndex) });
  }
  return tokens;
};

export const FractionText = ({
  text,
  className,
  fractionClassName,
  numeratorClassName,
  denominatorClassName,
}: {
  text: string;
  className?: string;
  fractionClassName?: string;
  numeratorClassName?: string;
  denominatorClassName?: string;
}) => {
  const tokens = tokenize(text);
  return (
    <View className="flex-row flex-wrap items-end">
      {tokens.map((token, idx) => {
        if (token.type === "text") {
          return (
            <Text key={`t-${idx}`} className={className}>
              {token.value}
            </Text>
          );
        }
        return (
          <View
            key={`f-${idx}`}
            className="mx-0.5 items-center justify-center"
            style={{ transform: [{ translateY: 1 }] }}
          >
            <Text className={numeratorClassName ?? fractionClassName}>{token.num}</Text>
            <View className="my-0.5 h-[1px] w-full bg-zinc-800 dark:bg-zinc-200" />
            <Text className={denominatorClassName ?? fractionClassName}>{token.den}</Text>
          </View>
        );
      })}
    </View>
  );
};
