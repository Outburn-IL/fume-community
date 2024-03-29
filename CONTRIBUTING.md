# Contributing to FUME Community

## Bug reports

If you think you have found a bug in FUME Community, first make sure that you are testing against the latest version - your issue may already have been fixed. If not, search our [issues list on GitHub](https://github.com/Outburn-IL/fume-community/issues) in case a similar issue has already been opened.

It is very helpful if you can prepare a reproduction of the bug. In other words, provide a small test case which we can run to confirm your bug. It makes it easier to find the problem and to fix it. For example:

```
EXAMPLE CODE
```

## Feature requests

If you find yourself wishing for a feature that doesn't exist in FUME Community, please let us know. Check the [issues list on GitHub](https://github.com/Outburn-IL/fume-community/issues) to see if a similar feature has already been requested. If no,open an issue on our issues list on GitHub which describes the feature you would like to see, why you need it, and how it should work.

## Contributing code and documentation changes

If you would like to contribute a new feature or a bug fix to FUME Community, please **discuss your idea first on the GitHub issue**. If there is no GitHub issue for your idea, please open one. It may be that somebody is already working on it, or that there are particular complexities that you should know about before starting the implementation. There are often a number of ways to fix a problem and it is important to find the right approach before spending time on a PR that cannot be merged.

### Fork and clone the repository

To make changes, you will need to fork this repository and clone it to your local machine.  See [GitHub help page](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) for help.

Once you forked the repository, clone it to your local work station and open it in your preferred editor. 

### Running the server

1. Install the recommended version as listed in the `.nvmrc` file. (Or use `nvm` or an equivalent version management tool).
2. Go to the `fume-community` folder
3. Install all dependencies 
 ```
 npm install
 ```
4. Run the development server 
 ```
 npm run dev
 ```
This will start the server in development mode on `localhost:42420` (the default port).

5. To change the default port or any other environment variable, you should create a file named `.env`. You can find two sample templates in the repository ([Stateful](https://github.com/Outburn-IL/fume-community/blob/main/.env.example.stateful) \ [Stateless](https://github.com/Outburn-IL/fume-community/blob/main/.env.example.stateless)).

### Testing your changes

1. Run unit tests by running the `npm run test:unit` command.
2. Run integration tests by running the `npm run test:integration` command. This will start a local FHIR service

### Submitting your changes

1. Comitting changes 

 Code goes through a linting check every time you commit. It will automatically fix any issues it can and fail if there are issues that can't be resolved. Please refrain from using `eslint-disable` and if you absolutely must, explain the reasoning behind doing so.
 
 Commit messages in the repository pass `commitlint` validation. We use the default `Angular` style commit messages. You can read about them [here](https://github.com/conventional-changelog/commitlint/tree/master/@commitlint/config-conventional#type-enum).

2. Test your changes

 Make sure to add unit and integration tests (where applicable) to verify your changes. 

3. Rebase your changes

 Update your local repository with the most recent code from the main Outburn-IL repository, and rebase your branch on top of the latest main branch.

3. Push your changes 

 Push changes to the repository you forked and create a pull requst to the `Outburn-IL/fume-community` repo.

 The first time you make a PR, one of our maintainers will have to approve tests to run on your PR. After that tests are automatically run for every PR. PRs can be merged only if all tests pass.

4. Sign the Contributor License Agreement

 If you haven't done so before, our `CLAassistant` will ask you to sign the CLA.

At this stage, we might ask you for clarifications or changes and once all are resolved we will gladly merge your contribution!

---
&copy; 2022-2024 Outburn Ltd. All Rights Reserved.
