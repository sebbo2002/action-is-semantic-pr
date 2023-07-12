declare module '@semantic-release/commit-analyzer' {
    import type { Commit, Context } from 'semantic-release';

    export interface SemanticReleaseAnalyzeContext extends Context {
        cwd: string;
        commits: Commit[];
    }

    export function analyzeCommits(pluginConfig: Record<string, unknown>, context: SemanticReleaseAnalyzeContext): Promise<string | null>;
}
