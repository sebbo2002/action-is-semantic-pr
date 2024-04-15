declare module '@semantic-release/commit-analyzer' {
    import type { VerifyConditionsContext } from 'semantic-release';

    export function analyzeCommits(pluginConfig: Record<string, unknown>, context: VerifyConditionsContext): Promise<string | null>;
}
