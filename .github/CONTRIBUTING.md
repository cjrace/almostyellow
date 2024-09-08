# Contributing to Almost yellow

## Table of Contents

- Getting Started
- How to Contribute
- Code of Conduct
- License

## Getting Started

Before you start contributing to the code, please take a moment to review the following resources:

- Project README: Make sure you can set up and run the project and tests locally.
- Issues: Check existing issues to see if there are any open tasks relating to what you plan to do.

## How to Contribute

1. **Create a branch**
   - Create a new branch based on the `main` branch

3. **Make changes**
   - Make your desired changes (bug fixes, new features, documentation updates, etc.)
   - Write clear commit messages that describe your changes
   - Keep scripts short and break out separate components where possible

4. **Test your changes**
   - Ensure that your changes work as expected in your local environment using `npm run dev`
   - Make sure the changes build using `npm run build`
   - Run the playwright tests `npx playwright test`
   - Run the linting script `npm run lint`
   - Resolve any errors that you find and repeat until tests and linting all pass
   - If you haven't already, consider adding additional playwright tests for your changes

5. **Submit a Pull Request (PR)**
   - Push your changes
   - Open a PR against the `main` branch of this repository
   - Follow the template to create a detailed description of your changes

## Code of Conduct

Please note that we have a [Code of Conduct](https://github.com/cjrace/almostyellow?tab=coc-ov-file) in place. By participating in this project, you agree to abide by its terms.

## License

Almost yellow is open-source software released under the MIT License.
