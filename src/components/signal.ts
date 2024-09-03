import {effect, signal} from "@preact/signals-react";
import * as FRAGS from "@thatopen/fragments";

export const fileSignal = signal<File | null>(null);
export const groupsSignal = signal<FRAGS.FragmentsGroup[]>([]);

const isBrowser = typeof window !== "undefined";
const settings = "App_settings";
const getDefault = () => {
  //@ts-ignore
  if (!isBrowser) return false;
  const setting = window.localStorage.getItem(settings);
  if (!setting) {
    const loadAsTile = false;
    return loadAsTile;
  } else {
    return JSON.parse(setting).loadAsTile || false;
  }
};
export const loadAsTileSignal = signal<boolean>(getDefault());

effect(() => {
  const loadAsTile = loadAsTileSignal.value;
  //@ts-ignore
  if (isBrowser)
    window.localStorage.setItem(settings, JSON.stringify({loadAsTile}));
});
