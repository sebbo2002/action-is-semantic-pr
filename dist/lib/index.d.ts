import { CoreInterface } from './core-mock.js';
export interface Context {
    owner: string;
    repo: string;
    sha: string;
    pull_number: number;
}
export default class Action {
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
