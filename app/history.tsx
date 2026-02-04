import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { HistoryList } from "../src/components/HistoryList";
import { useCalculator } from "../src/state/store";

export default function HistoryScreen() {
  const router = useRouter();
  const { state, dispatch } = useCalculator();

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-row items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Saved Measurements
        </Text>
        <Pressable
          onPress={() => router.back()}
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
    </View>
  );
}
