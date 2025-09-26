<p align="center">
  <a href="https://alkemio.org/" target="blank"><img src="https://alkemio.org/uploads/logos/alkemio-logo.svg" width="400" alt="Alkemio Logo" /></a>
</p>
<p align="center"><i>Smart safe spaces for collective action. On a platform designed to benefit society.</i></p>

# Alkemio Test Suites
Alkemio quallity assurance packages.

## Package Manager

This project uses [pnpm](https://pnpm.io/) as the package manager. To get started:

1. Install pnpm globally: `npm install -g pnpm`
2. Install dependencies: `pnpm install`
3. Build all packages: `pnpm run build`

## Repository Structure
This repository contains three core elements:
* Tests Library: for shared components that can be re-used across test suites
* Test Suite **Server-API**: used to validate the Alkemio server api.
* Test Suite **Client-web**: used to validate the Alkemio client web interaction.

The above are the maintained test suite related packages.

To do:
* There is a testOld directory that contains scripts / other work that has been carried out over the years and that will need to be cleaned up
* Bring back in the use of Husky
* Migrated code that is duplicated between client-web + server-api to be in the tests-lib package

