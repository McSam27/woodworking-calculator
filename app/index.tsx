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
import { ImperialKeypad } from "../src/components/ImperialKeypad";
import { MetricKeypad } from "../src/components/MetricKeypad";
import { FractionText } from "../src/components/FractionText";
import {
  formatImperial,
  formatImperialInches,
  fractionFromDecimal,
  inchesToMm,
  mmToInches,
  toDecimal,
} from "../src/lib/math";

const KeyButton = ({
  label,
  onPress,
  variant = "default",
  containerClassName,
  textClassName,
  style,
  onLongPress,
  onPressOut,
}: {
  label: string;
  onPress: () => void;
  variant?: "default" | "op" | "eq" | "danger";
  containerClassName?: string;
  textClassName?: string;
  style?: React.ComponentProps<typeof Pressable>["style"];
  onLongPress?: () => void;
  onPressOut?: () => void;
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
      onLongPress={onLongPress}
      onPressOut={onPressOut}
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

export default function CalculatorScreen() {
  const { state, dispatch } = useCalculator();
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  const [showUnits, setShowUnits] = useState(false);
  const fractionEntry = React.useRef(false);
  const justEvaluated = React.useRef(false);
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

  const showConversions = Boolean(state.result && !state.error && state.resultFrac);
  const baseValue = showConversions && state.resultFrac ? toDecimal(state.resultFrac) : 0;
  const metricBaseUnit = state.settings.unitSystem === "metric-cm" ? "cm" : "mm";
  const mm = isMetric
    ? metricBaseUnit === "cm"
      ? baseValue * 10
      : baseValue
    : inchesToMm(baseValue);
  const inches = isMetric ? mmToInches(mm) : baseValue;
  const inchesFrac = fractionFromDecimal(inches, 1000000);
  const inchesDisplayFrac = fractionFromDecimal(inches, state.settings.fractionPrecision);
  const cm = mm / 10;
  const formatFixed = (value: number, decimals = 2) =>
    value.toFixed(decimals).replace(/\.?0+$/, "");

  const handleKey = (k: string) => {
    fractionEntry.current = false;
    const operators = ["+", "-", "−", "×", "÷"];
    const isOperator = operators.includes(k);
    if (k === "AC") dispatch({ type: "CLEAR" });
    else if (k === "⌫") dispatch({ type: "BACKSPACE" });
    else if (k === "=") {
      justEvaluated.current = true;
      dispatch({ type: "EVAL" });
    }
    else if (k === "()") {
      const open = (state.expr.match(/\(/g) || []).length;
      const close = (state.expr.match(/\)/g) || []).length;
      if (justEvaluated.current) {
        justEvaluated.current = false;
        dispatch({ type: "SET_EXPR", val: open > close ? ")" : "(" });
      } else {
        dispatch({ type: "INPUT", val: open > close ? ")" : "(" });
      }
    } else {
      if (justEvaluated.current && !isOperator) {
        justEvaluated.current = false;
        dispatch({ type: "SET_EXPR", val: k });
      } else {
        justEvaluated.current = false;
        dispatch({ type: "INPUT", val: k });
      }
    }
  };

  const handleFractionDigit = (value: string) => {
    if (justEvaluated.current) {
      justEvaluated.current = false;
      dispatch({ type: "SET_EXPR", val: value });
      return;
    }
    const wasFractionEntry = fractionEntry.current;
    fractionEntry.current = true;
    const lastChar = state.expr.slice(-1);
    const autoSpace = !wasFractionEntry && /\d/.test(lastChar);
    dispatch({ type: "INPUT", val: `${autoSpace ? " " : ""}${value}` });
  };

  const handleDenominator = (den: string) => {
    if (justEvaluated.current) {
      justEvaluated.current = false;
      dispatch({ type: "SET_EXPR", val: `1/${den}` });
      return;
    }
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
      fractionEntry.current = false;
      dispatch({ type: "SET_EXPR", val: nextExpr });
      return;
    }

    if (/^\d+$/.test(tokenTrim)) {
      if (fractionEntry.current) {
        const nextExpr = `${expr.slice(0, lastOpIndex + 1)}${tokenTrim}/${den}`;
        fractionEntry.current = false;
        dispatch({ type: "SET_EXPR", val: nextExpr });
        return;
      }
      fractionEntry.current = false;
      dispatch({ type: "INPUT", val: ` 1/${den}` });
      return;
    }

    if (/\d$/.test(tokenTrim)) {
      fractionEntry.current = false;
      dispatch({ type: "INPUT", val: `/${den}` });
      return;
    }

    const lastChar = expr.slice(-1);
    const autoSpace = /\d/.test(lastChar);
    fractionEntry.current = false;
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
    { key: "metric", label: "Metric - mm", sub: "mm" },
    { key: "metric-cm", label: "Metric cm", sub: "cm" },
  ] as const;

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={["top", "bottom"]}>
      <StatusBar barStyle="default" />
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
                    {formatImperial(inchesDisplayFrac, state.settings.fractionPrecision)}
                  </Text>
                  <Text className="text-sm text-zinc-700 dark:text-zinc-200">
                    {(() => {
                      const den = state.settings.fractionPrecision;
                      const snapped = fractionFromDecimal(inches, den);
                      const approx = toDecimal(snapped);
                      const isFriendly = Math.abs(approx - inches) <= 1e-4;
                      if (isFriendly) {
                        return `${formatImperialInches(snapped, den).replace(/"$/, "")} in`;
                      }
                      return `${formatFixed(inches, 3)} in`;
                    })()}
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
                  <View className="w-full flex-row flex-wrap items-end justify-end">
                    <FractionText
                      text={state.expr}
                      className={`${
                        state.result ? "text-[32px]" : "text-[48px]"
                      } text-zinc-800 dark:text-zinc-200`}
                      fractionClassName={`${
                        state.result ? "text-[16px]" : "text-[24px]"
                      } text-zinc-800 dark:text-zinc-200`}
                      numeratorClassName={`${
                        state.result ? "text-[16px]" : "text-[24px]"
                      } text-zinc-800 dark:text-zinc-200`}
                    />
                    {!state.result && (
                      <Text className={`${
                        state.result ? "text-[32px]" : "text-[48px]"
                      } text-zinc-600 dark:text-zinc-400`}>|</Text>
                    )}
                  </View>
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
          <MetricKeypad
            keypadHeight={keypadHeight}
            keypadGap={keypadGap}
            metricKeyWidth={metricKeyWidth}
            metricKeyHeight={metricKeyHeight}
            onKeyPress={handleKey}
            getKeyTextClass={getKeyTextClass}
            KeyButton={KeyButton}
          />
        </View>
      ) : (
        <View className="flex-1 justify-end" style={{ paddingBottom: Math.max(insets.bottom / 2, 6) }}>
          <ImperialKeypad
            keypadHeight={keypadHeight}
            keypadGap={keypadGap}
            imperialKeyHeight={imperialKeyHeight}
            imperialKeyWidth={imperialKeyWidth}
            imperialLeftWidth={imperialLeftWidth}
            imperialRightWidth={imperialRightWidth}
            imperialWideKeyWidth={imperialWideKeyWidth}
            imperialBlockHeight={imperialBlockHeight}
            leftKeyWidth={leftKeyWidth}
            middleDividerTotal={middleDividerTotal}
            middleDividerWidth={middleDividerWidth}
            horizontalDividerTotal={horizontalDividerTotal}
            opsKeyWidth={opsKeyWidth}
            onKeyPress={handleKey}
            onFractionDigit={handleFractionDigit}
            onDenominator={handleDenominator}
            getKeyTextClass={getKeyTextClass}
            KeyButton={KeyButton}
          />
        </View>
      )}

      <Modal transparent visible={showHistory} animationType="slide">
        <View className="flex-1 bg-black/40">
          <Pressable
            onPress={() => setShowHistory(false)}
            className="absolute inset-0"
          />
          <View className="mt-16 flex-1 rounded-t-3xl bg-zinc-50 dark:bg-zinc-950">
            <View className="flex-row items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Saved Measurements
              </Text>
              <Pressable
                onPress={() => setShowHistory(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800"
              >
                <Ionicons name="close" size={16} color="#3f3f46" />
              </Pressable>
            </View>
            <HistoryList
              items={state.history}
              onDelete={(id) => dispatch({ type: "DELETE", id })}
              onToggleFavorite={(id) => dispatch({ type: "TOGGLE_FAV", id })}
              onSetDescription={(id, desc) => dispatch({ type: "SET_DESC", id, desc })}
              precision={state.settings.fractionPrecision}
            />
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showUnits} animationType="fade">
        <View className="flex-1 bg-black/20">
          <Pressable
            onPress={() => setShowUnits(false)}
            className="absolute inset-0"
          />
          <View className="ml-4 mt-16 w-44 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
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
                    <Ionicons name="checkmark" size={16} color="#b45309" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
