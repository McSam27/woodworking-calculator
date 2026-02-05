import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCalculator } from "../src/state/store";
import { HistoryList } from "../src/components/HistoryList";
import { formatImperial, inchesToMm, toDecimal } from "../src/lib/math";

const KeyButton = ({
  label,
  onPress,
  variant = "default",
  containerClassName,
  textClassName,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "default" | "op" | "eq" | "danger";
  containerClassName?: string;
  textClassName?: string;
  style?: React.ComponentProps<typeof Pressable>["style"];
}) => {
  const base =
    "items-center justify-center rounded-xl";
  const variants: Record<
    typeof variant,
    { container: string; text: string }
  > = {
    default: {
      container: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-900 dark:text-zinc-100",
    },
    op: {
      container: "bg-amber-100 dark:bg-amber-950",
      text: "text-amber-900 dark:text-amber-100",
    },
    eq: { container: "bg-amber-600", text: "text-white" },
    danger: {
      container: "bg-red-100 dark:bg-red-950",
      text: "text-red-700 dark:text-red-200",
    },
  };
  return (
    <Pressable
      onPress={onPress}
      className={`${base} ${variants[variant].container} ${containerClassName ?? ""}`}
      style={style}
    >
      <Text
        className={`text-4xl font-semibold ${variants[variant].text} ${textClassName ?? ""}`}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const SaveToast = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return (
    <View className="absolute left-1/2 top-14 z-50 -translate-x-1/2 flex-row items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 shadow">
      <Text className="text-xs font-semibold text-emerald-100">Saved</Text>
    </View>
  );
};

export default function CalculatorScreen() {
  const { state, dispatch } = useCalculator();
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  const [showUnits, setShowUnits] = useState(false);
  const insets = useSafeAreaInsets();
  const isMetric =
    state.settings.unitSystem === "metric" || state.settings.unitSystem === "metric-cm";
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const keypadGap = 8;
  const keypadPaddingX = 12;
  const keypadHeight = Math.round(screenHeight * 0.6);
  const metricCols = 4;
  const metricRows = 5;
  const metricKeyWidth =
    (screenWidth - keypadPaddingX * 2 - keypadGap * (metricCols - 1)) / metricCols;
  const metricKeyHeight =
    (keypadHeight - keypadGap * (metricRows - 1)) / metricRows;

  const imperialRows = 9;
  const middleDividerWidth = 3;
  const middleDividerTotal = keypadGap;
  const horizontalDividerTotal = middleDividerTotal;
  const dividerExtra = horizontalDividerTotal - keypadGap;
  const imperialKeyWidth =
    (screenWidth -
      keypadPaddingX * 2 -
      middleDividerTotal -
      keypadGap * 3) /
    5;
  const imperialKeyHeight =
    (keypadHeight - keypadGap * (imperialRows - 1) - dividerExtra) / imperialRows;
  const imperialLeftWidth = imperialKeyWidth * 2 + keypadGap;
  const imperialRightWidth = imperialKeyWidth * 3 + keypadGap * 2;
  const leftKeyWidth = imperialKeyWidth;
  const imperialWideKeyWidth = (imperialRightWidth - keypadGap) / 2;
  const keypadWidth = screenWidth - keypadPaddingX * 2;
  const opsKeyWidth = (keypadWidth - keypadGap * 3) / 4;
  const imperialBlockHeight =
    imperialKeyHeight * 7 + keypadGap * 5 + horizontalDividerTotal;

  useEffect(() => {
    if (!state.showSaveToast) return;
    const timer = setTimeout(() => dispatch({ type: "HIDE_TOAST" }), 1500);
    return () => clearTimeout(timer);
  }, [state.showSaveToast, dispatch]);

  const showConversions = Boolean(state.result && !state.error && state.resultFrac);
  const inches = showConversions && state.resultFrac ? toDecimal(state.resultFrac) : 0;
  const mm = inchesToMm(inches);
  const cm = mm / 10;
  const formatFixed = (value: number, decimals = 2) =>
    value.toFixed(decimals).replace(/\.?0+$/, "");

  const handleKey = (k: string) => {
    if (k === "AC") dispatch({ type: "CLEAR" });
    else if (k === "⌫") dispatch({ type: "BACKSPACE" });
    else if (k === "=") dispatch({ type: "EVAL" });
    else if (k === "()") {
      const open = (state.expr.match(/\(/g) || []).length;
      const close = (state.expr.match(/\)/g) || []).length;
      dispatch({ type: "INPUT", val: open > close ? ")" : "(" });
    } else {
      dispatch({ type: "INPUT", val: k });
    }
  };

  const handleFractionDigit = (value: string) => {
    const lastChar = state.expr.slice(-1);
    const autoSpace = /\d/.test(lastChar);
    dispatch({ type: "INPUT", val: `${autoSpace ? " " : ""}${value}` });
  };

  const handleDenominator = (den: string) => {
    const expr = state.expr;
    const operators = ["+", "-", "−", "×", "÷", "(", ")"];
    const lastOpIndex = Math.max(
      ...operators.map((op) => expr.lastIndexOf(op))
    );
    const token = expr.slice(lastOpIndex + 1);
    const tokenTrim = token.trim();
    const slashIndex = token.lastIndexOf("/");

    if (slashIndex >= 0) {
      const tokenBase = token.slice(0, slashIndex + 1);
      const nextExpr = `${expr.slice(0, lastOpIndex + 1)}${tokenBase}${den}`;
      dispatch({ type: "SET_EXPR", val: nextExpr });
      return;
    }

    if (/^\d+$/.test(tokenTrim)) {
      dispatch({ type: "INPUT", val: ` 1/${den}` });
      return;
    }

    if (/\d$/.test(tokenTrim)) {
      dispatch({ type: "INPUT", val: `/${den}` });
      return;
    }

    const lastChar = expr.slice(-1);
    const autoSpace = /\d/.test(lastChar);
    dispatch({ type: "INPUT", val: `${autoSpace ? " " : ""}1/${den}` });
  };

  const getKeyTextClass = (label: string) => {
    if (label.length >= 3) return "text-2xl";
    if (label.length === 2) return "text-3xl";
    return "text-4xl";
  };

  const unitLabel =
    state.settings.unitSystem === "imperial"
      ? "ft-in"
      : state.settings.unitSystem === "imperial-inches"
        ? "in"
        : state.settings.unitSystem === "metric-cm"
          ? "cm"
          : "mm";

  const unitOptions = [
    { key: "imperial", label: "Imperial", sub: "ft-in" },
    { key: "imperial-inches", label: "Inches", sub: "in" },
    { key: "metric", label: "Metric mm", sub: "mm" },
    { key: "metric-cm", label: "Metric cm", sub: "cm" },
  ] as const;

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={["top", "bottom"]}>
      <StatusBar barStyle="default" />
      <SaveToast show={state.showSaveToast} />

      <View className="flex-row items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-amber-600">•</Text>
          <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            WoodCalc
          </Text>
          <Pressable
            onPress={() => setShowUnits(true)}
            className="flex-row items-center gap-1 rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-950"
          >
            <Text className="text-xs font-semibold text-amber-700 dark:text-amber-200">
              {unitLabel}
            </Text>
            <Text className="text-xs font-semibold text-amber-700 dark:text-amber-200">
              ▾
            </Text>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setShowHistory(true)}
            className="relative h-9 flex-row items-center gap-2 rounded-full bg-amber-100 px-3 dark:bg-amber-950"
          >
            <Ionicons name="arrow-undo-circle-outline" size={18} color="#b45309" />
            <Text className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              History
            </Text>
            {state.history.length > 0 && (
              <View className="absolute -right-1 -top-1 min-w-[16px] items-center justify-center rounded-full bg-amber-600 px-1 py-0.5">
                <Text className="text-[9px] font-bold text-white">
                  {state.history.length}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            className="h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950"
          >
            <Ionicons name="settings-outline" size={18} color="#b45309" />
          </Pressable>
        </View>
      </View>

      <View className="min-h-[110px] bg-zinc-50 dark:bg-zinc-950">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="max-h-[220px]"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
        >
          <View className="flex-row gap-3">
            {showConversions && state.resultFrac && (
              <View className="w-1/3 rounded-xl bg-zinc-100 px-3 py-3 dark:bg-zinc-800">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Conversions
                </Text>
                <View className="mt-2 gap-1.5">
                  <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    {formatImperial(state.resultFrac, state.settings.fractionPrecision)}
                  </Text>
                  <Text className="text-sm text-zinc-700 dark:text-zinc-200">
                    {formatFixed(inches, 3)} in
                  </Text>
                  <Text className="text-sm text-zinc-700 dark:text-zinc-200">
                    {formatFixed(mm, 2)} mm
                  </Text>
                  <Text className="text-sm text-zinc-700 dark:text-zinc-200">
                    {formatFixed(cm, 2)} cm
                  </Text>
                </View>
              </View>
            )}
            <View className={showConversions ? "w-2/3" : "flex-1"}>
              <View className="min-h-[28px] flex-row flex-wrap items-center justify-end">
                {state.expr ? (
                  <Text
                    className={`w-full text-right ${
                      state.result ? "text-[32px]" : "text-[48px]"
                    } text-zinc-800 dark:text-zinc-200`}
                  >
                    {state.expr}
                    {!state.result && (
                      <Text className="text-zinc-600 dark:text-zinc-400">|</Text>
                    )}
                  </Text>
                ) : null}
              </View>
              {state.result && (
                <View className="mt-2 flex-row items-center justify-end gap-2">
                  <Text
                    className={`text-3xl font-bold ${
                      state.error
                        ? "text-red-500"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    = {state.result}
                  </Text>
                </View>
              )}
              {state.result &&
                !state.error &&
                !state.settings.autoSave &&
                state.lastEntry && (
                  <View className="mt-2 flex-row justify-end">
                    <Pressable
                      onPress={() => dispatch({ type: "SAVE_MANUAL" })}
                      className="rounded-lg bg-amber-600 px-4 py-2"
                    >
                      <Text className="text-xs font-semibold text-white">Save</Text>
                    </Pressable>
                  </View>
                )}
            </View>
          </View>
        </ScrollView>
      </View>

      {isMetric ? (
        <View className="flex-1 justify-end" style={{ paddingBottom: Math.max(insets.bottom / 2, 6) }}>
          <View
            className="flex-row gap-2 px-3 pb-2"
            style={{ height: keypadHeight }}
          >
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
                      onPress={() => handleKey(key)}
                      variant={isEq ? "eq" : isDanger ? "danger" : "default"}
                      style={{ width: metricKeyWidth, height: metricKeyHeight }}
                      textClassName={getKeyTextClass(key)}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <View className="flex-1 gap-2 items-end">
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
                    op.flex === 2
                      ? metricKeyHeight * 2 + keypadGap
                      : metricKeyHeight,
                }}
              >
                <KeyButton
                  label={op.label}
                  onPress={() => handleKey(op.label)}
                  variant="op"
                  style={{
                    width: metricKeyWidth,
                    height:
                      op.flex === 2
                        ? metricKeyHeight * 2 + keypadGap
                        : metricKeyHeight,
                  }}
                  textClassName={getKeyTextClass(op.label)}
                />
              </View>
            ))}
          </View>
          </View>
        </View>
      ) : (
        <View className="flex-1 justify-end" style={{ paddingBottom: Math.max(insets.bottom / 2, 6) }}>
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
                          onPress={() => handleKey(key)}
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
                          onPress={() => handleKey(row[0])}
                          style={{ width: imperialLeftWidth, height: imperialKeyHeight }}
                          textClassName={getKeyTextClass(row[0])}
                        />
                      ) : (
                        row.map((key) => (
                          <KeyButton
                            key={key}
                            label={key}
                            onPress={() => handleKey(key)}
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
                      {row.map((key) => (
                        <KeyButton
                          key={key}
                          label={key}
                          onPress={() => handleFractionDigit(key)}
                          style={{ width: imperialKeyWidth, height: imperialKeyHeight }}
                          textClassName={getKeyTextClass(key)}
                        />
                      ))}
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
                          onPress={() => handleDenominator(key)}
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
                            onPress={() => handleKey(key)}
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
                <View
                  className="flex-row justify-between"
                  style={{ height: imperialKeyHeight }}
                >
                  {["÷", "×", "−"].map((key) => (
                    <KeyButton
                      key={key}
                      label={key}
                      onPress={() => handleKey(key)}
                      variant="op"
                      style={{ width: opsKeyWidth, height: imperialKeyHeight }}
                      textClassName={getKeyTextClass(key)}
                    />
                  ))}
                </View>
                <KeyButton
                  label="="
                  onPress={() => handleKey("=")}
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
                onPress={() => handleKey("+")}
                variant="op"
                style={{ width: opsKeyWidth, height: imperialKeyHeight * 2 + keypadGap }}
                textClassName={getKeyTextClass("+")}
              />
            </View>
          </View>
        </View>
      )}

      <Modal transparent visible={showHistory} animationType="slide">
        <Pressable
          onPress={() => setShowHistory(false)}
          className="flex-1 bg-black/40"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="mt-16 flex-1 rounded-t-3xl bg-zinc-50 dark:bg-zinc-950"
          >
            <View className="flex-row items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Saved Measurements
              </Text>
              <Pressable
                onPress={() => setShowHistory(false)}
                className="rounded-lg bg-zinc-200 px-3 py-1.5 dark:bg-zinc-800"
              >
                <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                  Done
                </Text>
              </Pressable>
            </View>
            <HistoryList
              items={state.history}
              onDelete={(id) => dispatch({ type: "DELETE", id })}
              onToggleFavorite={(id) => dispatch({ type: "TOGGLE_FAV", id })}
              onSetDescription={(id, desc) => dispatch({ type: "SET_DESC", id, desc })}
              precision={state.settings.fractionPrecision}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={showUnits} animationType="fade">
        <Pressable
          onPress={() => setShowUnits(false)}
          className="flex-1 bg-black/20"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="ml-4 mt-16 w-44 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Text className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Units
            </Text>
            {unitOptions.map((option) => {
              const selected = state.settings.unitSystem === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    dispatch({ type: "SET_SETTING", key: "unitSystem", val: option.key });
                    dispatch({ type: "CLEAR" });
                    setShowUnits(false);
                  }}
                  className={`flex-row items-center justify-between rounded-xl px-2 py-2 ${
                    selected ? "bg-amber-100 dark:bg-amber-950" : ""
                  }`}
                >
                  <View>
                    <Text
                      className={`text-sm font-semibold ${
                        selected
                          ? "text-amber-800 dark:text-amber-200"
                          : "text-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      {option.label}
                    </Text>
                    <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {option.sub}
                    </Text>
                  </View>
                  {selected && (
                    <Text className="text-xs font-semibold text-amber-700 dark:text-amber-200">
                      Selected
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
