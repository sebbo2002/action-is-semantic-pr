const configuration = {
    'branches': [
        'main',
        {
            'name': 'develop',
            'channel': 'next',
            'prerelease': true
        }
    ],
    'plugins': []
};

configuration.plugins.push(['@semantic-release/commit-analyzer', {
    'releaseRules': [
        {'type': 'chore', 'scope': 'deps', 'release': 'patch'},
        {'type': 'chore', 'scope': 'package', 'release': 'patch'},
        {'type': 'build', 'scope': 'deps', 'release': 'patch'},
        {'type': 'docs', 'release': 'patch'}
    ]
}]);

configuration.plugins.push('@semantic-release/release-notes-generator');

configuration.plugins.push('@semantic-release/changelog');

configuration.plugins.push('semantic-release-license');

configuration.plugins.push(['@semantic-release/exec', {
    'prepareCmd': './.github/workflows/build.sh'
}]);

configuration.plugins.push(['@semantic-release/github', {
    'labels': false,
    'assignees': process.env.GH_OWNER
}]);

configuration.plugins.push(['@semantic-release/git', {
    'assets': ['CHANGELOG.md', 'LICENSE', 'dist/**/*'],
    'message': 'chore(release): :bookmark: ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
}]);

const dockerImages = [];
if (process.env.DOCKER_LOCAL_IMAGE_DH) {
    dockerImages.push(process.env.DOCKER_LOCAL_IMAGE_DH);
}
if (process.env.DOCKER_LOCAL_IMAGE_GH) {
    dockerImages.push(process.env.DOCKER_LOCAL_IMAGE_GH);
}
if(dockerImages.length > 0) {
    configuration.plugins.push(['@sebbo2002/semantic-release-docker', {
        images: dockerImages
    }]);
}

module.exports = configuration;
