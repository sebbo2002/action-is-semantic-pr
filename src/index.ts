import core from '@actions/core';
import github  from '@actions/github';

import Action from './lib';

try {
    if(!github.context.payload.pull_request) {
        core.setFailed('This action can only be used in a pull request context');
        process.exit(1);
    }

    const token = core.getInput('token');
    const context = {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: github.context.payload.pull_request.number
    };

    const action = new Action(token, context, core);
    action.run().catch(error => core.setFailed(error.message));
} catch (error) {
    if(error instanceof Error) {
        core.setFailed(error.message);
    } else {
        core.setFailed(String(error));
    }
}
