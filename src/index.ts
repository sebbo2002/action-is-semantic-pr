import * as core from '@actions/core';
import * as github from '@actions/github';

import Action from './lib/index.js';

try {
    if (!github.context.payload.pull_request) {
        core.setFailed(
            'This action can only be used in a pull request context',
        );
        process.exit(1);
    }

    const token = core.getInput('token');
    const context = {
        owner: github.context.repo.owner,
        pull_number: github.context.payload.pull_request.number,
        repo: github.context.repo.repo,
        sha: github.context.sha,
    };

    const action = new Action(token, context, core);
    action.run().catch((error: unknown) => core.setFailed(String(error)));
} catch (error) {
    if (error instanceof Error) {
        core.setFailed(error.message);
    } else {
        core.setFailed(String(error));
    }
}
