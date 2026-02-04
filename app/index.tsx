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
    "flex-1 items-center justify-center rounded-xl py-8";
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
      className={`${base} ${variants[variant].container}`}
    >
      <Text className={`text-4xl font-semibold ${variants[variant].text}`}>
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
  const [showCursor, setShowCursor] = useState(true);

  const keys = useMemo(() => {
    if (state.settings.unitSystem === "metric") {
      return [
        ["C", "⌫", "()", "÷"],
        ["7", "8", "9", "×"],
        ["4", "5", "6", "−"],
        ["1", "2", "3", "+"],
        ["", "0", ".", "="],
      ];
    }
    return [
      ["C", "⌫", "()", "÷"],
      ["7", "8", "9", "×"],
      ["4", "5", "6", "−"],
      ["1", "2", "3", "+"],
      ["0", "'", "\"", "="],
    ];
  }, [state.settings.unitSystem]);
  const fractionKeys = ["1/2", "1/4", "1/8", "1/16", "/", "Space"];

  useEffect(() => {
    if (!state.showSaveToast) return;
    const timer = setTimeout(() => dispatch({ type: "HIDE_TOAST" }), 1500);
    return () => clearTimeout(timer);
  }, [state.showSaveToast, dispatch]);

  useEffect(() => {
    const timer = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 550);
    return () => clearInterval(timer);
  }, []);

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
    if (value === "Space") {
      dispatch({ type: "INPUT", val: " " });
      return;
    }
    if (value === "/") {
      dispatch({ type: "INPUT", val: "/" });
      return;
    }
    const lastChar = state.expr.slice(-1);
    const autoSpace = /\d/.test(lastChar);
    dispatch({ type: "INPUT", val: `${autoSpace ? " " : ""}${value}` });
  };

  const unitLabel =
    state.settings.unitSystem === "imperial"
      ? "ft-in"
      : state.settings.unitSystem === "imperial-inches"
        ? "in"
        : "mm/cm";

  const unitOptions = [
    { key: "imperial", label: "Imperial", sub: "ft-in" },
    { key: "imperial-inches", label: "Inches", sub: "in" },
    { key: "metric", label: "Metric", sub: "mm/cm" },
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
        <Pressable
          onPress={() => router.push("/settings")}
          className="h-9 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950"
        >
          <Text className="text-xs font-semibold text-amber-800 dark:text-amber-200">User</Text>
        </Pressable>
      </View>

      <View className="min-h-[110px] justify-end bg-white px-4 py-4 dark:bg-zinc-900">
        <View className="min-h-[28px] flex-row flex-wrap items-center">
          {state.expr ? (
            <Text className="font-mono text-xl text-zinc-500 dark:text-zinc-400">
              {state.expr}
              {showCursor && !state.result && (
                <Text className="text-zinc-400 dark:text-zinc-500">|</Text>
              )}
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
              className={`font-mono text-3xl font-bold ${
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
                  Metric
                </Text>
              </View>
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
                <Text className="text-xs font-semibold text-white">Save</Text>
              </Pressable>
            </View>
          )}
      </View>

      <View className="flex-row gap-2 px-3 py-2">
        {fractionKeys.map((key) => (
          <Pressable
            key={key}
            onPress={() => handleFraction(key)}
            className="flex-1 rounded-lg bg-amber-100 py-3 dark:bg-amber-950"
          >
            <Text className="text-center text-sm font-semibold text-amber-800 dark:text-amber-200">
              {key}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-1 gap-2 px-3 pb-2">
        {keys.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} className="flex-1 flex-row gap-2">
            {row.map((key, idx) => {
              if (!key) {
                return <View key={`spacer-${idx}`} className="flex-1" />;
              }
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
            History
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
