import { createAfalApiServiceAdapter } from "../api";
import {
  createSeededSqliteAfalRuntimeService,
  getSeededSqliteAfalPaths,
  type SeededSqliteAfalPaths,
} from "../service";
import { createAfalHttpRouter } from "./router";

export interface SeededSqliteAfalHttpRouter {
  dataDir: string;
  paths: SeededSqliteAfalPaths;
  router: ReturnType<typeof createAfalHttpRouter>;
}

export function createSeededSqliteAfalHttpRouter(
  dataDir: string
): SeededSqliteAfalHttpRouter {
  const runtime = createSeededSqliteAfalRuntimeService(dataDir);
  const handlers = createAfalApiServiceAdapter(runtime);

  return {
    dataDir,
    paths: getSeededSqliteAfalPaths(dataDir),
    router: createAfalHttpRouter({ handlers }),
  };
}
