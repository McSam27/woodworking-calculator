import React, { useRef, useState } from "react";
import type { Pressable } from "react-native";
import { Pressable as RNPressable, Text, View } from "react-native";

type KeyButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "default" | "op" | "eq" | "danger";
  containerClassName?: string;
  textClassName?: string;
  style?: React.ComponentProps<typeof Pressable>["style"];
  onLongPress?: () => void;
  onPressOut?: () => void;
};

type Props = {
  keypadHeight: number;
  keypadGap: number;
  imperialKeyHeight: number;
  imperialKeyWidth: number;
  imperialLeftWidth: number;
  imperialRightWidth: number;
  imperialWideKeyWidth: number;
  imperialBlockHeight: number;
  leftKeyWidth: number;
  middleDividerTotal: number;
  middleDividerWidth: number;
  horizontalDividerTotal: number;
  opsKeyWidth: number;
  onKeyPress: (key: string) => void;
  onFractionDigit: (key: string) => void;
  onDenominator: (key: string) => void;
  getKeyTextClass: (key: string) => string;
  KeyButton: React.ComponentType<KeyButtonProps>;
};

export const ImperialKeypad = ({
  keypadHeight,
  keypadGap,
  imperialKeyHeight,
  imperialKeyWidth,
  imperialLeftWidth,
  imperialRightWidth,
  imperialWideKeyWidth,
  imperialBlockHeight,
  leftKeyWidth,
  middleDividerTotal,
  middleDividerWidth,
  horizontalDividerTotal,
  opsKeyWidth,
  onKeyPress,
  onFractionDigit,
  onDenominator,
  getKeyTextClass,
  KeyButton,
}: Props) => {
  const wholeNumberClass = "bg-zinc-200 dark:bg-zinc-900";
  const [showZeroPopover, setShowZeroPopover] = useState(false);
  const longPressActive = useRef(false);

  const handleNineLongPress = () => {
    longPressActive.current = true;
    setShowZeroPopover(true);
  };

  const handleNinePressOut = () => {
    if (longPressActive.current) {
      onFractionDigit("0");
    }
    longPressActive.current = false;
    setShowZeroPopover(false);
  };

  const handleNinePress = () => {
    if (longPressActive.current) return;
    onFractionDigit("9");
  };

  const handleZeroFromPopover = () => {
    setShowZeroPopover(false);
    onFractionDigit("0");
  };

  return (
    <View className="gap-2 px-3 pb-2" style={{ height: keypadHeight }}>
    <View className="flex-row items-start">
      <View style={{ width: imperialLeftWidth }}>
        <View className="gap-2">
          {[
            ["1", "2"],
            ["3", "4"],
            ["5", "6"],
          ].map((row, rowIndex) => (
            <View
              key={`imperial-left-top-${rowIndex}`}
              className="flex-row justify-between"
              style={{ height: imperialKeyHeight, width: imperialLeftWidth }}
            >
              {row.map((key) => (
                <KeyButton
                  key={key}
                  label={key}
                  onPress={() => onKeyPress(key)}
                  containerClassName={wholeNumberClass}
                  style={{ width: leftKeyWidth, height: imperialKeyHeight }}
                  textClassName={getKeyTextClass(key)}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={{ height: horizontalDividerTotal }} />
        <View className="gap-2">
          {[
            ["7", "8"],
            ["9", "0"],
            [".", "'"],
            ["\""],
          ].map((row, rowIndex) => (
            <View
              key={`imperial-left-bottom-${rowIndex}`}
              className="flex-row justify-between"
              style={{ height: imperialKeyHeight, width: imperialLeftWidth }}
            >
              {row.length === 1 ? (
                <KeyButton
                  label={row[0]}
                  onPress={() => onKeyPress(row[0])}
                  containerClassName={wholeNumberClass}
                  style={{ width: imperialLeftWidth, height: imperialKeyHeight }}
                  textClassName={getKeyTextClass(row[0])}
                />
              ) : (
                row.map((key) => (
                  <KeyButton
                    key={key}
                    label={key}
                    onPress={() => onKeyPress(key)}
                    containerClassName={wholeNumberClass}
                    style={{ width: leftKeyWidth, height: imperialKeyHeight }}
                    textClassName={getKeyTextClass(key)}
                  />
                ))
              )}
            </View>
          ))}
        </View>
      </View>
      <View style={{ width: middleDividerTotal, height: imperialBlockHeight }} />
      <View style={{ width: imperialRightWidth }}>
        <View className="gap-2">
          {[
            ["1", "2", "3"],
            ["4", "5", "6"],
            ["7", "8", "9"],
          ].map((row, rowIndex) => (
            <View
              key={`imperial-right-top-${rowIndex}`}
              className="flex-row justify-between"
              style={{ height: imperialKeyHeight }}
            >
              {row.map((key) =>
                key === "9" ? (
                  <View key={key} className="relative">
                    <KeyButton
                      label={key}
                      onPress={handleNinePress}
                      onLongPress={handleNineLongPress}
                      onPressOut={handleNinePressOut}
                      style={{ width: imperialKeyWidth, height: imperialKeyHeight }}
                      textClassName={getKeyTextClass(key)}
                    />
                    {showZeroPopover && (
                      <RNPressable
                        onPress={handleZeroFromPopover}
                        className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1 shadow dark:bg-zinc-100"
                      >
                        <Text className="text-base font-semibold text-white dark:text-zinc-900">
                          0
                        </Text>
                      </RNPressable>
                    )}
                  </View>
                ) : (
                  <KeyButton
                    key={key}
                    label={key}
                    onPress={() => onFractionDigit(key)}
                    style={{ width: imperialKeyWidth, height: imperialKeyHeight }}
                    textClassName={getKeyTextClass(key)}
                  />
                )
              )}
            </View>
          ))}
        </View>
        <View
          className="items-center justify-center"
          style={{ height: horizontalDividerTotal }}
        >
          <View
            className="rounded-full bg-zinc-300 dark:bg-zinc-700"
            style={{ height: middleDividerWidth, width: imperialRightWidth }}
          />
        </View>
        <View className="gap-2">
          {[
            ["2", "4", "8"],
            ["16", "32", "64"],
          ].map((row, rowIndex) => (
            <View
              key={`imperial-right-den-${rowIndex}`}
              className="flex-row justify-between"
              style={{ height: imperialKeyHeight }}
            >
              {row.map((key) => (
                <KeyButton
                  key={key}
                  label={key}
                  onPress={() => onDenominator(key)}
                  style={{ width: imperialKeyWidth, height: imperialKeyHeight }}
                  textClassName={getKeyTextClass(key)}
                />
              ))}
            </View>
          ))}
          {[
            ["AC", "⌫"],
            ["(", ")"],
          ].map((row, rowIndex) => (
            <View
              key={`imperial-right-controls-${rowIndex}`}
              className="flex-row justify-between"
              style={{ height: imperialKeyHeight }}
            >
              {row.map((key) => {
                const isDanger = key === "AC" || key === "⌫";
                return (
                  <KeyButton
                    key={key}
                    label={key}
                    onPress={() => onKeyPress(key)}
                    variant={isDanger ? "danger" : "default"}
                    style={{ width: imperialWideKeyWidth, height: imperialKeyHeight }}
                    textClassName={getKeyTextClass(key)}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
    <View
      className="flex-row"
      style={{ height: imperialKeyHeight * 2 + keypadGap, gap: keypadGap }}
    >
      <View style={{ width: opsKeyWidth * 3 + keypadGap * 2 }}>
        <View className="flex-row justify-between" style={{ height: imperialKeyHeight }}>
          {["÷", "×", "−"].map((key) => (
            <KeyButton
              key={key}
              label={key}
              onPress={() => onKeyPress(key)}
              variant="op"
              style={{ width: opsKeyWidth, height: imperialKeyHeight }}
              textClassName={getKeyTextClass(key)}
            />
          ))}
        </View>
        <KeyButton
          label="="
          onPress={() => onKeyPress("=")}
          variant="eq"
          style={{
            width: opsKeyWidth * 3 + keypadGap * 2,
            height: imperialKeyHeight,
            marginTop: keypadGap,
          }}
          textClassName={getKeyTextClass("=")}
        />
      </View>
      <KeyButton
        label="+"
        onPress={() => onKeyPress("+")}
        variant="op"
        style={{ width: opsKeyWidth, height: imperialKeyHeight * 2 + keypadGap }}
        textClassName={getKeyTextClass("+")}
      />
    </View>
    </View>
  );
};
