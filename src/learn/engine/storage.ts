// Learn shares the hunt board's storage layer, so one push to my-notebook/progress.json carries both prefixes.
// The page is rendered after reading/storage.ts has hydrated from the server, so the fde: keys are in place before first read.
// The phone build has no server, so it takes storage.phone.ts and the dashboard layer is not bundled.
import * as dash from "../../reading/storage.ts";
import * as phone from "./storage.phone.ts";

export const readKey = import.meta.env.VITE_PHONE === "1" ? phone.readKey : dash.readKey;
export const writeKey = import.meta.env.VITE_PHONE === "1" ? phone.writeKey : dash.writeKey;
export const removeKey = import.meta.env.VITE_PHONE === "1" ? phone.removeKey : dash.removeKey;
export const useStored = import.meta.env.VITE_PHONE === "1" ? phone.useStored : dash.useStored;
export const useStorageVersion = import.meta.env.VITE_PHONE === "1" ? phone.useStorageVersion : dash.useStorageVersion;
