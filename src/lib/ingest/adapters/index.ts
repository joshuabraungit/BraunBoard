import type { Adapter, AtsProvider } from "../types";
import { greenhouse } from "./greenhouse";
import { lever } from "./lever";
import { ashby } from "./ashby";

export const adapters: Record<AtsProvider, Adapter> = { greenhouse, lever, ashby };
