import React, { createContext, useContext } from "react";
import type { ExternalDatasourcesConfig } from "./types";

export const ProgramFormRemoteContext = createContext<ExternalDatasourcesConfig | null>(null);

export function useProgramFormRemote(): ExternalDatasourcesConfig | null {
  return useContext(ProgramFormRemoteContext);
}
