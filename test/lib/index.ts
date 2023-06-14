'use strict';

import assert from 'assert';
import { core, resetBuffer, getBuffer } from '../../src/lib/core-mock.js';
import Action, { Context } from '../../src/lib/index.js';

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
    throw new Error('Unable to run tests, please set GITHUB_TOKEN or GH_TOKEN environment variable');
}

describe('Action', function () {
    this.timeout(10000);
    beforeEach(function () {
        resetBuffer();
    });

    it('should throw error if PR doesn\'t exist', async function () {
        const context: Context = {
            owner: 'sebbo2002',
            repo: 'ical-generator',
            pull_number: -1
        };

        await assert.rejects(async () => {
            await new Action(token, context, core).run();
        }, /Error: Unable to fetch PR information: HttpError: Not Found/);
    });

    it('should do nothing with merged PRs', async function () {
        const context: Context = {
            owner: 'sebbo2002',
            repo: 'ical-generator',
            pull_number: 368
        };

        await new Action(token, context, core).run();
        assert.deepStrictEqual(getBuffer(), [
            ['info', 'Hmm, what do we have here. So Pull Request #368 you want me to look at.'],
            ['info', 'Nice, Pull Request is already merged - so nothing to do here…']
        ]);
    });

    it('should work if there\'s no semantic-release configuration', async function () {
        const context: Context = {
            owner: 'sebbo2002',
            repo: 'ical-generator',
            pull_number: 110
        };

        await new Action(token, context, core).run();
        assert.deepStrictEqual(getBuffer(), [
            ['info', 'Hmm, what do we have here. So Pull Request #110 you want me to look at.'],
            ['info', 'No semantic-release configuration found'],
            ['output', 'type', 'patch'],
            ['notice', 'This PR will create a patch release 🎉']
        ]);
    });

    it('should work with PRs which woun’t trigger a release', async function () {
        const context: Context = {
            owner: 'sebbo2002',
            repo: 'ical-generator',
            pull_number: 370
        };

        await new Action(token, context, core).run();
        assert.deepStrictEqual(getBuffer(), [
            ['info', 'Hmm, what do we have here. So Pull Request #370 you want me to look at.'],
            ['group', 'Found this configuration for @semantic-release/commit-analyzer', [
                [
                    'info',
                    '{\n  "releaseRules": [\n    {\n      "type": "chore",\n      "scope": "deps",\n      "release": "patch"\n    },\n    {\n      "type": "chore",\n      "scope": "package",\n      "release": "patch"\n    },\n    {\n      "type": "build",\n      "scope": "deps",\n      "release": "patch"\n    },\n    {\n      "type": "docs",\n      "release": "patch"\n    }\n  ]\n}'
                ]
            ]],
            ['output', 'type', null],
            ['warning', 'This PR contains conventional commits, but no release will be triggered on merge 😞']
        ]);
    });

    it('should work with PRs which will trigger a release', async function () {
        const context: Context = {
            owner: 'sebbo2002',
            repo: 'ical-generator',
            pull_number: 215
        };

        await new Action(token, context, core).run();
        assert.deepStrictEqual(getBuffer(), [
            ['info', 'Hmm, what do we have here. So Pull Request #215 you want me to look at.'],
            ['group', 'Found this configuration for @semantic-release/commit-analyzer', [
                [
                    'info',
                    '{\n  "preset": "angular",\n  "releaseRules": [\n    {\n      "type": "refactor",\n      "release": "patch"\n    },\n    {\n      "type": "style",\n      "release": "patch"\n    },\n    {\n      "type": "build",\n      "scope": "deps",\n      "release": "patch"\n    },\n    {\n      "type": "docs",\n      "release": "patch"\n    }\n  ]\n}'
                ]
            ]],
            ['output', 'type', 'minor'],
            ['notice', 'This PR will create a minor release 🎉']
        ]);
    });

    it('should work with PRs which have no convential commits included', async function () {
        const context: Context = {
            owner: 'sebbo2002',
            repo: 'ical-generator',
            pull_number: 190
        };

        await assert.rejects(async () => {
            await new Action(token, context, core).run();
        }, /This PR does not seem to contain any conventional commits!/);
    });
});
