import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCalculator } from "../src/state/store";
import { HistoryList } from "../src/components/HistoryList";

const KeyButton = ({
  label,
  onPress,
  variant = "default",
}: {
  label: string;
  onPress: () => void;
  variant?: "default" | "op" | "eq" | "danger";
}) => {
  const base =
    "flex-1 items-center justify-center rounded-xl py-4 text-lg font-semibold";
  const variants: Record<typeof variant, string> = {
    default: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
    op: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
    eq: "bg-amber-600 text-white",
    danger: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <Pressable onPress={onPress} className={`${base} ${variants[variant]}`}>
      <Text className="text-2xl font-semibold">{label}</Text>
    </Pressable>
  );
};

const SaveToast = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return (
    <View className="absolute left-1/2 top-14 z-50 -translate-x-1/2 flex-row items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 shadow">
      <Text className="text-base text-emerald-100">✓</Text>
      <Text className="text-xs font-semibold text-emerald-100">Saved</Text>
    </View>
  );
};

export default function CalculatorScreen() {
  const { state, dispatch } = useCalculator();
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);

  const keys = useMemo(
    () => [
      ["C", "⌫", "()", "÷"],
      ["7", "8", "9", "×"],
      ["4", "5", "6", "−"],
      ["1", "2", "3", "+"],
      ["0", "'", "\"", "="],
    ],
    []
  );
  const fractionKeys = ["1/2", "1/4", "1/8", "1/16", "/"];

  useEffect(() => {
    if (!state.showSaveToast) return;
    const timer = setTimeout(() => dispatch({ type: "HIDE_TOAST" }), 1500);
    return () => clearTimeout(timer);
  }, [state.showSaveToast, dispatch]);

  const handleKey = (k: string) => {
    if (k === "C") dispatch({ type: "CLEAR" });
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

  const handleFraction = (value: string) => {
    if (value === "/") {
      dispatch({ type: "INPUT", val: "/" });
      return;
    }
    const lastChar = state.expr.slice(-1);
    const autoSpace = /\d/.test(lastChar);
    dispatch({ type: "INPUT", val: `${autoSpace ? " " : ""}${value}` });
  };

  const unitLabel =
    state.settings.unitSystem === "imperial" ? "ft-in" : state.metricDisplayUnit;

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={["top", "bottom"]}>
      <StatusBar barStyle="default" />
      <SaveToast show={state.showSaveToast} />

      <View className="flex-row items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-amber-600">◉</Text>
          <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            WoodCalc
          </Text>
          <View className="rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-950">
            <Text className="text-[10px] font-semibold text-amber-700 dark:text-amber-200">
              {unitLabel}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/settings")}
          className="h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950"
        >
          <Text className="text-base">👤</Text>
        </Pressable>
      </View>

      <View className="min-h-[110px] justify-end bg-white px-4 py-4 dark:bg-zinc-900">
        <View className="min-h-[28px] flex-row flex-wrap items-center">
          {state.expr ? (
            <Text className="font-mono text-lg text-zinc-500 dark:text-zinc-400">
              {state.expr}
            </Text>
          ) : (
            <Text className="text-base text-zinc-400 dark:text-zinc-600">
              Enter measurement...
            </Text>
          )}
        </View>
        {state.result && (
          <View className="mt-2 flex-row items-center justify-end gap-2">
            <Text
              className={`font-mono text-2xl font-bold ${
                state.error
                  ? "text-red-500"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              = {state.result}
            </Text>
            {!state.error && state.settings.unitSystem === "metric" && (
              <View className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                <Text className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                  {state.metricDisplayUnit.toUpperCase()}
                </Text>
              </View>
            )}
            {state.settings.unitConversionEnabled &&
              !state.error &&
              state.resultFrac && (
                <Pressable
                  onPress={() => dispatch({ type: "CONVERT" })}
                  className={`rounded-lg px-3 py-1.5 ${
                    state.resultConverted
                      ? "bg-amber-600"
                      : "bg-amber-100 dark:bg-amber-950"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      state.resultConverted
                        ? "text-white"
                        : "text-amber-700 dark:text-amber-200"
                    }`}
                  >
                    {state.settings.unitSystem === "metric"
                      ? state.metricDisplayUnit.toUpperCase()
                      : "⇄"}
                  </Text>
                </Pressable>
              )}
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
                <Text className="text-xs font-semibold text-white">💾 Save</Text>
              </Pressable>
            </View>
          )}
      </View>

      <View className="flex-row gap-2 px-3 py-2">
        {fractionKeys.map((key) => (
          <Pressable
            key={key}
            onPress={() => handleFraction(key)}
            className="flex-1 rounded-lg bg-amber-100 py-2 dark:bg-amber-950"
          >
            <Text className="text-center text-xs font-semibold text-amber-800 dark:text-amber-200">
              {key}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-1 gap-2 px-3 pb-2">
        {keys.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} className="flex-1 flex-row gap-2">
            {row.map((key) => {
              const isOp = ["÷", "×", "−", "+"].includes(key);
              const isEq = key === "=";
              const isDanger = key === "C" || key === "⌫";
              return (
                <KeyButton
                  key={key}
                  label={key}
                  onPress={() => handleKey(key)}
                  variant={isEq ? "eq" : isOp ? "op" : isDanger ? "danger" : "default"}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <Pressable
          onPress={() => setShowHistory(true)}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            📋 History
          </Text>
          {state.history.length > 0 && (
            <View className="rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-950">
              <Text className="text-xs font-bold text-amber-700 dark:text-amber-200">
                {state.history.length}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

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
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
