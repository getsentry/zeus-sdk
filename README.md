<p align="center">
    <img src="https://user-images.githubusercontent.com/1433023/32629198-3c6f225e-c54d-11e7-96db-99fd22709a1b.png" width="271">
</p>

# Zeus JavaScript SDK

[![Travis](https://img.shields.io/travis/getsentry/zeus-sdk.svg)](https://travis-ci.org/getsentry/zeus-sdk)
[![GitHub release](https://img.shields.io/github/release/getsentry/zeus-sdk.svg)](https://github.com/getsentry/zeus-sdk/releases/latest)
[![npm version](https://img.shields.io/npm/v/@zeus-ci/sdk.svg)](https://www.npmjs.com/package/@zeus-ci/sdk)
[![license](https://img.shields.io/github/license/getsentry/zeus-sdk.svg)](https://github.com/getsentry/zeus-sdk/blob/master/LICENSE)

JavaScript API client for [Zeus](https://github.com/getsentry/zeus).

## Installation

The CLI comes as NPM package and can be installed via npm or yarn:

```bash
npm install -g @zeus-ci/sdk
yarn add -g @zeus-ci/sdk
```

## Development

This SDK is built with [TypeScript](https://www.typescriptlang.org/). After
installing dependencies, your workspace should contain all tools necessary to
develop, test and build the project. See `package.json` for all scripts:

```sh
# Install dependencies
yarn

# Run test watchers
yarn test:watch

# Build JavaScript sources
yarn build
```

We use [prettier](https://prettier.io/) for auto-formatting and
[tslint](https://palantir.github.io/tslint/) as linter. Both tools can
automatically fix a lot of issues for you. To invoke them, simply run:

```sh
yarn fix
```

It is highly recommended to use VSCode and install the suggested extensions.
They will configure your IDE to match the coding style, invoke auto formatters
every time you save and run tests in the background for you. No need to run the
watchers manually.
