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
    sha: string;
    pull_number: number;
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

export { type Context, Action as default };
