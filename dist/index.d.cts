import { Context as Context$1, Commit } from 'semantic-release';

type CoreInterface = {
    info(message: string): void;
    error(message: string | Error): void;
    warning(message: string | Error): void;
    notice(message: string): void;
    startGroup(message: string): void;
    endGroup(): void;
    setOutput(key: string, value: unknown): void;
};

interface Context {
    owner: string;
    repo: string;
    pull_number: number;
}
interface SemanticReleaseAnalyzeContext extends Context$1 {
    cwd: string;
    commits: Commit[];
}
declare class Action {
    private readonly github;
    private readonly context;
    private readonly core;
    constructor(token: string, context: Context, core: CoreInterface);
    run(): Promise<void>;
    private static isConventionalCommitLike;
    private getPR;
    private getSemanticReleaseConfig;
    private static downloadFile;
}

export { Context, SemanticReleaseAnalyzeContext, Action as default };
