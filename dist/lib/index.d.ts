import { CoreInterface } from './core-mock';
import type { Context as SemanticReleaseContext, Commit as SemanticReleaseCommit } from 'semantic-release';
export interface Context {
    owner: string;
    repo: string;
    pull_number: number;
}
export interface SemanticReleaseAnalyzeContext extends SemanticReleaseContext {
    cwd: string;
    commits: SemanticReleaseCommit[];
}
export default class Action {
    private readonly github;
    private readonly context;
    private readonly core;
    constructor(token: string, context: Context, core: CoreInterface);
    run(): Promise<void>;
    private getPR;
    private getSemanticReleaseConfig;
    private static downloadFile;
}
