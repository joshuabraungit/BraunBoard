import type { Adapter, AtsProvider } from "../types";
import { greenhouse } from "./greenhouse";
import { lever } from "./lever";
import { ashby } from "./ashby";
import { workday } from "./workday";
import { smartrecruiters } from "./smartrecruiters";
import { workable } from "./workable";

export const adapters: Record<AtsProvider, Adapter> = { greenhouse, lever, ashby, workday, smartrecruiters, workable };
