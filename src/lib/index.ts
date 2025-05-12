import { Octokit } from '@octokit/rest';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { cosmiconfig } from 'cosmiconfig';
import { createWriteStream } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { get } from 'https';
import { tmpdir } from 'os';
import { join } from 'path';
import { type AnalyzeCommitsContext } from 'semantic-release';
import signale from 'signale';

import { type CoreInterface } from './core-mock.js';
const { Signale } = signale;

export interface Context {
    owner: string;
    pull_number: number;
    repo: string;
    sha: string;
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
    'release.config.cjs',
];

export default class Action {
    private readonly context: Context;
    private readonly core: CoreInterface;
    private readonly github: Octokit;

    constructor(token: string, context: Context, core: CoreInterface) {
        this.github = new Octokit({
            auth: token,
            log: {
                debug: () => ({}),
                error: (message) => core.error(message),
                info: () => ({}),
                warn: (message) => core.warning(message),
            },
            userAgent: '@sebbo2002/action-is-semantic-pr',
        });
        this.context = context;
        this.core = core;
    }
    private static async downloadFile(
        file: { download_url: null | string; name: string },
        dir: string,
    ): Promise<void> {
        const url = file.download_url;
        if (!url) {
            return;
        }

        await new Promise((cb) => {
            get(url, function (res) {
                const filePath = join(dir, file.name);
                const fileStream = createWriteStream(filePath);
                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    cb(null);
                });
            });
        });
    }

    private static isConventionalCommitLike(message: string): boolean {
        return !!message.match(
            /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+/,
        );
    }

    public async run(): Promise<void> {
        this.core.info(
            `Hmm, what do we have here. So Pull Request #${this.context.pull_number} you want me to look at.`,
        );

        const pr = await this.getPR();
        if (pr.merged) {
            this.core.endGroup();
            this.core.info(
                'Nice, Pull Request is already merged - so nothing to do here…',
            );
            return;
        }

        // Load PR commits
        const { data: commits } = await this.github.rest.pulls.listCommits({
            ...this.context,
        });

        // Load File Index
        const { data: fileIndex } = await this.github.rest.repos.getContent({
            ...this.context,
            path: '',
            ref: pr.base.sha,
        });
        if (!Array.isArray(fileIndex)) {
            throw new Error('Unable to get file index');
        }

        // Semantic Release Commit Analyzer Config
        const configFiles = fileIndex.filter((file) =>
            RELEVANT_SEMANTIC_RELEASE_FILES.includes(file.name),
        );
        const configuration = await this.getSemanticReleaseConfig(configFiles);
        if (configuration) {
            this.core.startGroup(
                'Found this configuration for @semantic-release/commit-analyzer',
            );
            this.core.info(JSON.stringify(configuration, null, 2));
            this.core.endGroup();
        } else {
            this.core.info('No semantic-release configuration found');
        }

        const context: AnalyzeCommitsContext = {
            branch: {
                name: pr.base.ref,
            },
            branches: [],
            commits: commits.map((commit) => ({
                author: {
                    email: String(commit.commit.author?.email),
                    name: String(commit.commit.author?.name),
                    short: String(commit.commit.author?.email).substring(0, 7),
                },
                body: commit.commit.message
                    .split('\n')
                    .slice(1)
                    .join('\n')
                    .trim(),
                commit: {
                    long: commit.sha,
                    short: commit.sha.substring(0, 7),
                },
                committer: {
                    email: String(commit.commit.committer?.email),
                    name: String(commit.commit.committer?.name),
                    short: String(commit.commit.committer?.email).substring(
                        0,
                        7,
                    ),
                },
                committerDate:
                    commit.commit.committer?.date || new Date().toJSON(),
                hash: commit.sha,
                message: commit.commit.message,
                subject: commit.commit.message.split('\n')[0].trim(),
                tree: {
                    long: commit.sha,
                    short: commit.sha.substring(0, 7),
                },
            })),
            cwd: process.cwd(),
            // @ts-expect-error process.env and context.env
            env: process.env,
            envCi: {
                branch: pr.base.ref,
                commit: this.context.sha,
                isCi: true,
            },

            // @ts-expect-error it still works…
            lastRelease: null,
            logger: new Signale({ disabled: true }),
            releases: [],
            stderr: process.stderr,
            stdout: process.stdout,
        };

        const hasConventionalCommitLike = !!commits.find((commit) =>
            Action.isConventionalCommitLike(commit.commit.message),
        );
        const releaseType = await analyzeCommits(configuration || {}, context);
        this.core.setOutput('type', releaseType);

        if (releaseType) {
            this.core.notice(`This PR will create a ${releaseType} release 🎉`);
        } else if (hasConventionalCommitLike) {
            this.core.warning(
                'This PR contains conventional commits, but no release will be triggered on merge 😞',
            );
        } else {
            throw new Error(
                'This PR does not seem to contain any conventional commits!',
            );
        }
    }

    private async getPR(): Promise<{
        base: { ref: string; sha: string };
        id: number;
        merged: boolean;
    }> {
        try {
            const { data: pr } = await this.github.rest.pulls.get({
                ...this.context,
            });

            return pr;
        } catch (error) {
            throw new Error(`Unable to fetch PR information: ${error}`);
        }
    }

    private async getSemanticReleaseConfig(
        files: Array<{ download_url: null | string; name: string }>,
    ) {
        const dir = await mkdtemp(join(tmpdir(), 'is-semantic-release'));

        try {
            await Promise.all(
                files.map((file) => Action.downloadFile(file, dir)),
            );
            const { config } = (await cosmiconfig('release').search(dir)) || {};
            const analyzerConfig = config?.plugins?.find(
                (config: [string, Record<string, unknown>] | string) =>
                    Array.isArray(config) &&
                    config[0] === '@semantic-release/commit-analyzer',
            );

            if (analyzerConfig) {
                return analyzerConfig[1] as Record<string, unknown>;
            }

            return null;
        } finally {
            await rm(dir, { recursive: true });
        }
    }
}
