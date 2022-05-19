import { Octokit } from '@octokit/rest';
import { CoreInterface } from './core-mock';

import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { get } from 'https';
import { createWriteStream } from 'fs';
import { cosmiconfig } from 'cosmiconfig';

import { analyzeCommits } from '@semantic-release/commit-analyzer';

import type {
    Context as SemanticReleaseContext,
    Commit as SemanticReleaseCommit
} from 'semantic-release';


export interface Context {
    owner: string;
    repo: string;
    pull_number: number;
}

export interface SemanticReleaseAnalyzeContext extends SemanticReleaseContext {
    cwd: string;
    commits: SemanticReleaseCommit[];
}

const RELEVANT_SEMANTIC_RELEASE_FILES = [
    'package.json',
    '.releaserc',
    '.releaserc.json',
    '.releaserc.yaml',
    '.releaserc.yml',
    '.releaserc.js',
    '.releaserc.cjs',
    'release.config.js',
    'release.config.cjs'
];

export default class Action {
    private readonly github: Octokit;
    private readonly context: Context;
    private readonly core: CoreInterface;

    constructor (token: string, context: Context, core: CoreInterface) {
        this.github = new Octokit({
            auth: token,
            userAgent: '@sebbo2002/action-is-semantic-pr',
            log: {
                debug: () => ({}),
                info: () => ({}),
                warn: message => core.warning(message),
                error: message => core.error(message)
            },
        });
        this.context = context;
        this.core = core;
    }
    public async run(): Promise<void> {
        this.core.info(`Hmm, what do we have here. So Pull Request #${this.context.pull_number} you want me to look at.`);

        const pr = await this.getPR();
        if(pr.merged) {
            this.core.endGroup();
            this.core.info('Nice, Pull Request is already merged - so nothing to do here…');
            return;
        }

        // Load PR commits
        const { data: commits } = await this.github.rest.pulls.listCommits({
            ...this.context
        });

        // Load File Index
        const { data: fileIndex } = await this.github.rest.repos.getContent({
            ...this.context,
            ref: pr.base.sha,
            path: ''
        });
        if(!Array.isArray(fileIndex)) {
            throw new Error('Unable to get file index');
        }

        // Semantic Release Commit Analyzer Config
        const configFiles = fileIndex.filter(file => RELEVANT_SEMANTIC_RELEASE_FILES.includes(file.name));
        const configuration = await this.getSemanticReleaseConfig(configFiles);
        if (configuration) {
            this.core.startGroup('Found this configuration for @semantic-release/commit-analyzer');
            this.core.info(JSON.stringify(configuration, null, 2));
            this.core.endGroup();
        } else {
            this.core.info('No semantic-release configuration found');
        }

        const context: SemanticReleaseAnalyzeContext = {
            commits: commits.map(commit => ({
                commit: {
                    long: commit.sha,
                    short: commit.sha.substring(0, 7)
                },
                tree: {
                    long: commit.sha,
                    short: commit.sha.substring(0, 7)
                },
                author: {
                    name: String(commit.commit.author?.name),
                    email: String(commit.commit.author?.email),
                    short: String(commit.commit.author?.email).substring(0, 7)
                },
                committer: {
                    name: String(commit.commit.committer?.name),
                    email: String(commit.commit.committer?.email),
                    short: String(commit.commit.committer?.email).substring(0, 7)
                },
                subject: commit.commit.message.split('\n')[0].trim(),
                body: commit.commit.message.split('\n').slice(1).join('\n').trim(),
                message: commit.commit.message,
                hash: commit.sha,
                committerDate: commit.commit.committer?.date || new Date().toJSON()
            })),
            cwd: process.cwd(),
            env: {},
            logger: {
                log: () => ({}),
                error: message => this.core.error(message)
            }
        };

        const hasConventionalCommitLike = !!commits.find(commit => Action.isConventionalCommitLike(commit.commit.message));
        const releaseType = await analyzeCommits(configuration || {}, context);
        this.core.setOutput('type', releaseType);

        if (releaseType) {
            this.core.notice(`This PR will create a ${releaseType} release 🎉`);
        }
        else if(hasConventionalCommitLike) {
            this.core.warning('This PR contains conventional commits, but no release will be triggered on merge 😞');
        }
        else {
            throw new Error('This PR does not seem to contain any conventional commits!');
        }
    }

    private static isConventionalCommitLike(message: string): boolean {
        return !!message.match(/^(feat|fix|docs|style|refactor|perf|test|chore|revert|build)(\(.+\))?: .+/);
    }

    private async getPR(): Promise<{id: number, merged: boolean, base: {sha: string}}> {
        try {
            const { data: pr } = await this.github.rest.pulls.get({
                ...this.context
            });

            return pr;
        }
        catch(error) {
            throw new Error(`Unable to fetch PR information: ${error}`);
        }
    }

    private async getSemanticReleaseConfig(files: Array<{name: string, download_url: string | null}>) {
        const dir = await mkdtemp(join(tmpdir(), 'is-semantic-release'));

        try {
            await Promise.all(files.map(file => Action.downloadFile(file, dir)));
            const {config} = (await cosmiconfig('release').search(dir)) || {};
            const analyzerConfig = config?.plugins?.find((config: [string, Record<string, unknown>] | string) =>
                Array.isArray(config) && config[0] === '@semantic-release/commit-analyzer'
            );

            if(analyzerConfig) {
                return analyzerConfig[1] as Record<string, unknown>;
            }

            return null;
        }
        finally {
            await rm(dir, { recursive: true });
        }
    }

    private static async downloadFile(file: {name: string, download_url: string | null}, dir: string): Promise<void> {
        const url = file.download_url;
        if(!url) {
            return;
        }

        await new Promise((cb) => {
            get(url, function(res) {
                const filePath = join(dir, file.name);
                const fileStream = createWriteStream(filePath);
                res.pipe(fileStream);

                fileStream.on('finish',() => {
                    fileStream.close();
                    cb(null);
                });
            });
        });
    }
}
