import { createAfalApiServiceAdapter } from "../api";
import {
  createSeededDurableAfalRuntimeService,
  getSeededDurableAfalPaths,
  type SeededDurableAfalPaths,
} from "../service";
import { createAfalHttpRouter } from "./router";

export interface SeededDurableAfalHttpRouter {
  dataDir: string;
  paths: SeededDurableAfalPaths;
  router: ReturnType<typeof createAfalHttpRouter>;
}

export function createSeededDurableAfalHttpRouter(
  dataDir: string
): SeededDurableAfalHttpRouter {
  const runtime = createSeededDurableAfalRuntimeService(dataDir);
  const handlers = createAfalApiServiceAdapter(runtime);

  return {
    dataDir,
    paths: getSeededDurableAfalPaths(dataDir),
    router: createAfalHttpRouter({ handlers }),
  };
}
