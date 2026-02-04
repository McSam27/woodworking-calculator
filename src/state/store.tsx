import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { evaluateExpression, formatConverted, formatResult, toDecimal, type Fraction, type UnitSystem } from "../lib/math";

export type Precision = 2 | 4 | 8 | 16 | 32;

export type CalculationRecord = {
  id: string;
  expression: string;
  result: string;
  resultRaw: number;
  unitSystem: UnitSystem;
  isFavorited: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  autoSave: boolean;
  unitSystem: UnitSystem;
  fractionPrecision: Precision;
  unitConversionEnabled: boolean;
  theme: "system";
};

type State = {
  expr: string;
  result: string | null;
  resultFrac: Fraction | null;
  resultOriginalUnit: UnitSystem | null;
  resultConverted: boolean;
  history: CalculationRecord[];
  settings: Settings;
  lastEntry: CalculationRecord | null;
  showSaveToast: boolean;
};

type Action =
  | { type: "INPUT"; val: string }
  | { type: "CLEAR" }
  | { type: "BACKSPACE" }
  | { type: "EVAL" }
  | { type: "SAVE_MANUAL" }
  | { type: "HIDE_TOAST" }
  | { type: "TOGGLE_FAV"; id: string }
  | { type: "DELETE"; id: string }
  | { type: "CLEAR_ALL" }
  | { type: "SET_DESC"; id: string; desc: string }
  | { type: "SET_SETTING"; key: keyof Settings; val: Settings[keyof Settings] }
  | { type: "CONVERT" }
  | { type: "LOAD_STATE"; history: CalculationRecord[]; settings: Settings };

const SETTINGS_KEY = "woodcalc_settings";
const HISTORY_KEY = "woodcalc_history";

const uuid = () => `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const initialSettings: Settings = {
  autoSave: true,
  unitSystem: "imperial",
  fractionPrecision: 16,
  unitConversionEnabled: false,
  theme: "system",
};

const initialState: State = {
  expr: "",
  result: null,
  resultFrac: null,
  resultOriginalUnit: null,
  resultConverted: false,
  history: [],
  settings: initialSettings,
  lastEntry: null,
  showSaveToast: false,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "INPUT":
      return {
        ...state,
        expr: state.expr + action.val,
        result: null,
        resultFrac: null,
        resultConverted: false,
        showSaveToast: false,
      };
    case "CLEAR":
      return {
        ...state,
        expr: "",
        result: null,
        resultFrac: null,
        resultConverted: false,
        lastEntry: null,
        showSaveToast: false,
      };
    case "BACKSPACE":
      return { ...state, expr: state.expr.slice(0, -1), result: null, showSaveToast: false };
    case "EVAL": {
      if (!state.expr.trim()) return state;
      const frac = evaluateExpression(state.expr, state.settings.unitSystem);
      if (!frac) {
        return { ...state, result: "Error", resultFrac: null, resultConverted: false };
      }
      const formatted = formatResult(frac, state.settings.unitSystem, state.settings.fractionPrecision);
      const now = new Date().toISOString();
      const entry: CalculationRecord = {
        id: uuid(),
        expression: state.expr,
        result: formatted,
        resultRaw: toDecimal(frac),
        unitSystem: state.settings.unitSystem,
        isFavorited: false,
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      if (state.settings.autoSave) {
        return {
          ...state,
          result: formatted,
          resultFrac: frac,
          resultOriginalUnit: state.settings.unitSystem,
          resultConverted: false,
          history: [entry, ...state.history],
          lastEntry: null,
          showSaveToast: true,
        };
      }
      return {
        ...state,
        result: formatted,
        resultFrac: frac,
        resultOriginalUnit: state.settings.unitSystem,
        resultConverted: false,
        lastEntry: entry,
        showSaveToast: false,
      };
    }
    case "SAVE_MANUAL":
      if (!state.lastEntry) return state;
      return {
        ...state,
        history: [state.lastEntry, ...state.history],
        lastEntry: null,
        showSaveToast: true,
      };
    case "HIDE_TOAST":
      return { ...state, showSaveToast: false };
    case "TOGGLE_FAV":
      return {
        ...state,
        history: state.history.map((h) =>
          h.id === action.id ? { ...h, isFavorited: !h.isFavorited, updatedAt: new Date().toISOString() } : h
        ),
      };
    case "DELETE":
      return { ...state, history: state.history.filter((h) => h.id !== action.id) };
    case "CLEAR_ALL":
      return { ...state, history: [] };
    case "SET_DESC":
      return {
        ...state,
        history: state.history.map((h) =>
          h.id === action.id ? { ...h, description: action.desc, updatedAt: new Date().toISOString() } : h
        ),
      };
    case "SET_SETTING":
      return { ...state, settings: { ...state.settings, [action.key]: action.val } };
    case "CONVERT": {
      if (!state.resultFrac || state.result === "Error" || !state.resultOriginalUnit) return state;
      if (!state.resultConverted) {
        const converted = formatConverted(
          state.resultFrac,
          state.resultOriginalUnit,
          state.settings.fractionPrecision
        );
        return { ...state, result: converted, resultConverted: true };
      }
      const original = formatResult(
        state.resultFrac,
        state.resultOriginalUnit,
        state.settings.fractionPrecision
      );
      return { ...state, result: original, resultConverted: false };
    }
    case "LOAD_STATE":
      return { ...state, history: action.history, settings: action.settings };
    default:
      return state;
  }
};

type CalculatorContextValue = {
  state: State;
  dispatch: React.Dispatch<Action>;
};

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export const CalculatorProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [settingsRaw, historyRaw] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(HISTORY_KEY),
        ]);
        const settings = settingsRaw ? (JSON.parse(settingsRaw) as Settings) : initialSettings;
        const history = historyRaw ? (JSON.parse(historyRaw) as CalculationRecord[]) : [];
        dispatch({ type: "LOAD_STATE", history, settings });
      } catch {
        dispatch({ type: "LOAD_STATE", history: [], settings: initialSettings });
      } finally {
        hydrated.current = true;
      }
    };
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }, [state.settings]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
  }, [state.history]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <CalculatorContext.Provider value={value}>{children}</CalculatorContext.Provider>;
};

export const useCalculator = () => {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error("useCalculator must be used within CalculatorProvider");
  return ctx;
};
