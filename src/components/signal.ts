import { signal } from "@preact/signals-react";

export const fileSignal = signal<File | null>( null )