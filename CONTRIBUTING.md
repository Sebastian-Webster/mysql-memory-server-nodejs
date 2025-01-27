# Contributing

Thank you for having an interest in contributing to `mysql-memory-server`! To get started, fork this repository and clone it to your machine. You can learn how to do that [here](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo?platform=mac)

# Download dependencies

The next step is to download dependencies for this project. Use `npm` to install the dependencies by running the following command:

```sh
npm install
```

# Make your changes

Everything has now been setup! You can now make your desired changes to the code.

# Building

To build the code, you can run the command:

```sh
npx tsc
```

Building the code will change the files in the `dist` folder. Before committing your changes, please make sure no changes from the `dist` folder end up in the commit.

The `dist` folder is only modified when a new version of this package is published to npm.

If you just want to check that there are no build errors without modifying the `dist` folder's files, you can run the command:

```sh
npx tsc --noEmit
```

# Test the code

For manual testing, build the code and then create a new project and run the command

```sh
npm install path/to/mysql-memory-server
```

replacing "path/to/mysql-memory-server" with the path to this repository on your computer. You can then write code that uses `mysql-memory-server` and test your changes.

There are also automated tests which you can run by running the command:

```sh
npm test
```

Please do not run the `npm run test:ci` or `npm run stress:ci` command to test your code locally. That command is meant to only be used in GitHub Actions.

# Submitting the pull request

Before submitting the pull request, please make sure the following are true:
- All the automated tests pass
- There are no build errors
- Your commits do not contain any changes from the `dist` folder

Now that your change has been made, it's time to commit and push your code to your forked repository. Once that's done, you can create a pull request. You can learn more about that [here](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)