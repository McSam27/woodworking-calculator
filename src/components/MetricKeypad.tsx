import React from "react";
import type { Pressable } from "react-native";
import { View } from "react-native";

type KeyButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "default" | "op" | "eq" | "danger";
  textClassName?: string;
  style?: React.ComponentProps<typeof Pressable>["style"];
};

type Props = {
  keypadHeight: number;
  keypadGap: number;
  metricKeyWidth: number;
  metricKeyHeight: number;
  onKeyPress: (key: string) => void;
  getKeyTextClass: (key: string) => string;
  KeyButton: React.ComponentType<KeyButtonProps>;
};

export const MetricKeypad = ({
  keypadHeight,
  keypadGap,
  metricKeyWidth,
  metricKeyHeight,
  onKeyPress,
  getKeyTextClass,
  KeyButton,
}: Props) => (
  <View className="flex-row gap-2 px-3 pb-2" style={{ height: keypadHeight }}>
    <View className="flex-[3] gap-2">
      {[
        ["AC", "⌫", "()"],
        ["7", "8", "9"],
        ["4", "5", "6"],
        ["1", "2", "3"],
        ["0", ".", "="],
      ].map((row, rowIndex) => (
        <View
          key={`metric-row-${rowIndex}`}
          className="flex-row justify-between"
          style={{ height: metricKeyHeight }}
        >
          {row.map((key) => {
            const isEq = key === "=";
            const isDanger = key === "AC" || key === "⌫";
            return (
              <KeyButton
                key={key}
                label={key}
                onPress={() => onKeyPress(key)}
                variant={isEq ? "eq" : isDanger ? "danger" : "default"}
                style={{ width: metricKeyWidth, height: metricKeyHeight }}
                textClassName={getKeyTextClass(key)}
              />
            );
          })}
        </View>
      ))}
    </View>
    <View className="flex-1 items-end gap-2">
      {[
        { label: "÷", flex: 1 },
        { label: "×", flex: 1 },
        { label: "−", flex: 1 },
        { label: "+", flex: 2 },
      ].map((op) => (
        <View
          key={op.label}
          style={{
            height:
              op.flex === 2 ? metricKeyHeight * 2 + keypadGap : metricKeyHeight,
          }}
        >
          <KeyButton
            label={op.label}
            onPress={() => onKeyPress(op.label)}
            variant="op"
            style={{
              width: metricKeyWidth,
              height: op.flex === 2 ? metricKeyHeight * 2 + keypadGap : metricKeyHeight,
            }}
            textClassName={getKeyTextClass(op.label)}
          />
        </View>
      ))}
    </View>
  </View>
);
