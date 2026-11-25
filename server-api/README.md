# server-api-tests
Alkemio API tests against the Alkemio GraphQL server endpoint

# Quality Assurance + Testing

Initial version of integration api tests is in place. To run them, look at the prerequisites, below:

- Used frameworks/packages [jest](https://jestjs.io/) and `supertest`
- Running `Alkemio/Server` endpoint.
- Users from bootstrap must be registered on the environment under test and share the same credentials
  space.admin@alkem.io
  qa.user@alkem.io
  space.member@alkem.io
  non.space@alkem.io
  admin@alkem.io
- Local `.env` file must contain the following vairable, to run tests with authentication:
- `AUTH_TEST_HARNESS_PASSWORD` password of the user set on the target endpoint (i.e. dev, test, local)
- `ALKEMIO_SERVER=http://localhost:4455/admin/graphql` endpoint used for gathering token based on provided credentials
- `ALKEMIO_SERVER_URL=http://localhost:4455/admin/graphql` endpoint used for graphql requests
- In order to run the tests, execute the following command: `npm run test:[TEST_TYPE]` where TEST_TYPE is `it`
  - To run specific suite: `npm run-script test:[TEST_TYPE] ./test folder>/<test suite file>` (i.e. `npm run-script test:it ./src/functional/integration/challenge/create-challenge.it-spec.ts`)
- The results of the test, will be displayed at the end of the execution.

Automation test structure

```
server/
 src/
  domain/
   challenge/
     challenge.service.ts
     challenge.service.spec.ts
 test/
  config/
    jest.config.it.ts
    etc...
  functional/
   integration/
    challenge/
      create-challenge.e2e-spec.ts
   non-functional/
    auth/
      anonymous-user.it-spec.ts
    performance/
   utils/
     token.helper.ts
     graphql.request.ts
```

Test types

    - functional integration tests: `*.it-spec.ts` API testing of application services against endpoint of any the environments(local, dev, test)(i.e. "https://dev.alkem.io/graphql")

Run tests:

    - run all tests: `npm run-script test:nightly`
    - run all tests from particular test suite area: `npm run-script test:it ./src/functional-api/integration/challenge/`
    - run all tests for a test file: `npm run-script test:it ./src/functional-api/integration/challenge/query-challenge-data.it-spec.ts`

To debug tests in VS Code

- Use `Debug Jest IT Tests` configuration for IT tests

To run only one test from a test file

- Set the keyword _.only_ after `test` or `describe` (i.e. `test.only('should remove a challenge', async () => {})`)
- Run the command for this particular test file: `npm run-script test:it ./src/functional/integration/challenge/query-challenge-data.it-spec.ts`
