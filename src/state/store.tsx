import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  evaluateExpression,
  formatResult,
  toDecimal,
  type Fraction,
  type MetricUnit,
  type UnitSystem,
} from "../lib/math";

export type Precision = 2 | 4 | 8 | 16 | 32;

export type CalculationRecord = {
  id: string;
  expression: string;
  result: string;
  resultRaw: number;
  unitSystem: UnitSystem;
  inputUnit: "mm" | "cm" | "in" | "ft/in";
  isFavorited: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  autoSave: boolean;
  unitSystem: UnitSystem;
  fractionPrecision: Precision;
  theme: "system" | "light" | "dark";
};

type State = {
  expr: string;
  result: string | null;
  error: string | null;
  resultFrac: Fraction | null;
  history: CalculationRecord[];
  settings: Settings;
  lastEntry: CalculationRecord | null;
};

type Action =
  | { type: "INPUT"; val: string }
  | { type: "SET_EXPR"; val: string }
  | { type: "CLEAR" }
  | { type: "BACKSPACE" }
  | { type: "EVAL" }
  | { type: "SAVE_MANUAL" }
  | { type: "TOGGLE_FAV"; id: string }
  | { type: "DELETE"; id: string }
  | { type: "CLEAR_ALL" }
  | { type: "SET_DESC"; id: string; desc: string }
  | { type: "SET_SETTING"; key: keyof Settings; val: Settings[keyof Settings] }
  | { type: "LOAD_STATE"; history: CalculationRecord[]; settings: Settings };

const SETTINGS_KEY = "woodcalc_settings";
const HISTORY_KEY = "woodcalc_history";

const uuid = () => `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const initialSettings: Settings = {
  autoSave: true,
  unitSystem: "imperial",
  fractionPrecision: 16,
  theme: "system",
};

const initialState: State = {
  expr: "",
  result: null,
  error: null,
  resultFrac: null,
  history: [],
  settings: initialSettings,
  lastEntry: null,
};

const deriveInputUnit = (expression: string, unitSystem: UnitSystem) => {
  if (unitSystem === "imperial-inches") return "in";
  if (unitSystem === "imperial") return "ft/in";
  if (unitSystem === "metric-cm") return "cm";
  if (/cm\b/i.test(expression)) return "cm";
  return "mm";
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "INPUT":
      return {
        ...state,
        expr: state.expr + action.val,
        result: null,
        error: null,
        resultFrac: null,
      };
    case "SET_EXPR":
      return {
        ...state,
        expr: action.val,
        result: null,
        error: null,
        resultFrac: null,
      };
    case "CLEAR":
      return {
        ...state,
        expr: "",
        result: null,
        error: null,
        resultFrac: null,
        lastEntry: null,
      };
    case "BACKSPACE":
      return {
        ...state,
        expr: state.expr.slice(0, -1),
        result: null,
        error: null,
      };
    case "EVAL": {
      if (!state.expr.trim()) return state;
      const evalUnitSystem =
        state.settings.unitSystem === "metric-cm" ? "metric" : state.settings.unitSystem;
      const evaluation = evaluateExpression(state.expr, evalUnitSystem);
      if (!evaluation.value) {
        const message = evaluation.error ?? "Enter a valid expression";
        return {
          ...state,
          result: message,
          error: message,
          resultFrac: null,
        };
      }
      const frac = evaluation.value;
      const metricUnit: MetricUnit =
        state.settings.unitSystem === "metric-cm"
          ? "cm"
          : state.settings.unitSystem === "metric" && /cm\b/i.test(state.expr)
            ? "cm"
            : "mm";
      const formatted = formatResult(
        frac,
        state.settings.unitSystem,
        state.settings.fractionPrecision,
        metricUnit
      );
      const now = new Date().toISOString();
      const entry: CalculationRecord = {
        id: uuid(),
        expression: state.expr,
        result: formatted,
        resultRaw: toDecimal(frac),
        unitSystem: state.settings.unitSystem,
        inputUnit: deriveInputUnit(state.expr, state.settings.unitSystem),
        isFavorited: false,
        description: null,
        createdAt: now,
        updatedAt: now,
      };
      if (state.settings.autoSave) {
        return {
          ...state,
          result: formatted,
          error: null,
          resultFrac: frac,
          history: [entry, ...state.history],
          lastEntry: null,
        };
      }
      return {
        ...state,
        result: formatted,
        error: null,
        resultFrac: frac,
        lastEntry: entry,
      };
    }
    case "SAVE_MANUAL":
      if (!state.lastEntry) return state;
      return {
        ...state,
        history: [state.lastEntry, ...state.history],
        lastEntry: null,
      };
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
    case "LOAD_STATE":
      return {
        ...state,
        history: action.history.map((item) => ({
          ...item,
          inputUnit: item.inputUnit ?? deriveInputUnit(item.expression, item.unitSystem),
        })),
        settings: action.settings,
      };
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
        const parsed = settingsRaw ? (JSON.parse(settingsRaw) as Settings) : initialSettings;
        const settings: Settings = {
          ...initialSettings,
          ...parsed,
          theme: parsed?.theme ?? initialSettings.theme,
        };
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
