import { createContext, useContext } from "react";
const ProgramFormRemoteContext = createContext(null);
function useProgramFormRemote() {
  return useContext(ProgramFormRemoteContext);
}
export {
  ProgramFormRemoteContext,
  useProgramFormRemote
};
