import type { Result } from '@hoshi/sdk'
import type { ExecutionService } from '../services/executor.js'
import type { PolicyEngine } from '../services/policy.js'
import type {
  RuntimeActionOptions,
  RuntimeEvent,
  RuntimeRunResult,
  RuntimeStorePort,
} from './types.js'
import { RuntimeLoop, type RuntimeLoopExecutor, type RuntimeLoopOptions } from './loop.js'

export class RuntimeOrchestrator {
  private readonly loop: RuntimeLoop

  constructor(
    policyEngine: PolicyEngine,
    executionService: ExecutionService,
    runtimeStore?: RuntimeStorePort,
    ) {
    this.loop = new RuntimeLoop(policyEngine, executionService, runtimeStore)
  }

  preview(options: RuntimeActionOptions) {
    return this.loop.preview(options)
  }

  run<T>(
    options: RuntimeLoopOptions,
    executor: RuntimeLoopExecutor<T>,
  ): Promise<Result<RuntimeRunResult<T>, Error>> {
    return this.loop.run(options, executor)
  }
}

export type { RuntimeEvent }
