import {
  challengeNameId,
  createChallangeMutation,
} from '../../functional/integration/challenge/challenge.request.params';
import {
  createEcoverseMutation,
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverseMutation,
} from '../../functional/integration/ecoverse/ecoverse.request.params';
import {
  createOrganisationMutation,
  organisationName,
  hostNameId,
  deleteOrganisationMutation,
} from '../../functional/integration/organisation/organisation.request.params';
import { graphqlRequestAuth } from '../../utils/graphql.request';
import {
  challengeVariablesData,
  createChallengMut,
  createChildChallengeMut,
  createEcoverseMut,
  createOrganisationMut,
  ecoverseVariablesData,
  organisationVariablesData,
  uniqueId,
} from '../../utils/mutations/create-mutation';
import { TestUser } from '../../utils/token.helper';

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';
const forbiddenCode = '"code":"FORBIDDEN"';
const userNotRegistered = 'USER_NOT_REGISTERED';

let ecoverseId = '';
//let organisationId = '';
let challengeId = '';
// beforeAll(async done => {
//   const responseOrg = await createOrganisationMutation(
//     organisationName,
//     hostNameId
//   );
//   // console.log(responseOrg.body);
//   organisationId = responseOrg.body.data.createOrganisation.id;
//   let responseEco = await createEcoverseMutation(
//     ecoverseName,
//     ecoverseNameId,
//     organisationId
//   );
//   ecoverseId = responseEco.body.data.createEcoverse.id;
//   const response = await createChallangeMutation(
//     'testChallengeName',
//     challengeNameId
//   );
//   challengeId = response.body.data.createChallenge.id;

//   done();
// });

// afterAll(async () => {
//   await removeEcoverseMutation(ecoverseId);
//   await deleteOrganisationMutation(organisationId);
// });

// describe('zz', () => {
//   // //let challengeId = '';
//   //   beforeAll(async done => {
//   //   const responseOrg = await createOrganisationMutation(
//   //     organisationName,
//   //     hostNameId
//   //   );
//   //   console.log(responseOrg.body);
//   //   organisationId = responseOrg.body.data.createOrganisation.id;
//   //   let responseEco = await createEcoverseMutation(
//   //     ecoverseName,
//   //     ecoverseNameId,
//   //     organisationId
//   //   );
//   //   console.log(responseEco.body);
//   //   ecoverseId = responseEco.body.data.createEcoverse.id;
//   //   const res = await createChallangeMutation(
//   //     'testChallengeName',
//   //     challengeNameId,
//   //     ecoverseId
//   //   );
//   //   console.log(res.body);
//   //   challengeId = res.body.data.createChallenge.id;

//   //    done();
//   //   });
//   //   describe.each`
//   //   mutation                   | variables                                                                                   | idName    | expected
//   //   ${createOrganisationMut}   | ${organisationVariablesData(`orgName${uniqueId}`, `orgNameId${uniqueId}`)}                  | ${'test'} | ${notAuthorizedCode}
//   //   ${createEcoverseMut}       | ${ecoverseVariablesData(`ecoName${uniqueId}`, `ecoNameId${uniqueId}`, hostNameId)}          | ${'test'} | ${notAuthorizedCode}
//   //   ${createChallengMut}       | ${challengeVariablesData('test', 'test', ecoverseNameId)}                                   | ${'test'} | ${notAuthorizedCode}
//   //   ${createChildChallengeMut} | ${challengeVariablesData(`childChName${uniqueId}`, `chChName${uniqueId}`, challengeId)} | ${'test'} | ${notAuthorizedCode}
//   // `
//   // ('$mutation',({ mutation, variables, idName, expected }))=>{
//   //     // Arrange
//   //     test(
//   //       "should NOT expect: '$expected' for create mutation: variables: '$variables'",

//   //       async ('test,() => {
//   //         // Act
//   //         const requestParamsCreateMutations = {
//   //           operationName: null,
//   //           query: mutation,
//   //           variables: await variables,
//   //         };
//   //         const response = await graphqlRequestAuth(
//   //           requestParamsCreateMutations,
//   //           TestUser.GLOBAL_ADMIN
//   //         );
//   //         console.log(response.body);
//   //         const responseData = JSON.stringify(response.body).replace('\\', '');
//   //         // let a;
//   //         // if (response.text.includes('errors')) {
//   //         //   a = console.error('Request failed', response);
//   //         // }

//   //         // Assert
//   //         //expect(a).not.toBe(undefined);
//   //         expect(response.status).toBe(200);
//   //         expect(responseData).not.toContain(expected);
//   //         expect(responseData).not.toContain(forbiddenCode);
//   //         expect(responseData).not.toContain(userNotRegistered);
//   //       }
//   //     );
//   //     // beforeAll(async done => {
//   //     //   const responseOrg = await createOrganisationMutation(
//   //     //     organisationName,
//   //     //     hostNameId
//   //     //   );
//   //     //   console.log(responseOrg.body);
//   //     //   organisationId = responseOrg.body.data.createOrganisation.id;
//   //     //   let responseEco = await createEcoverseMutation(
//   //     //     ecoverseName,
//   //     //     ecoverseNameId,
//   //     //     organisationId
//   //     //   );
//   //     //   console.log(responseEco.body);
//   //     //   ecoverseId = responseEco.body.data.createEcoverse.id;
//   //     //   const res = await createChallangeMutation(
//   //     //     'testChallengeName',
//   //     //     challengeNameId,
//   //     //     ecoverseId
//   //     //   );
//   //     //   console.log(res.body);
//   //     //   challengeId = res.body.data.createChallenge.id;
//   //     //   done();
//   //     // });
//   //   });
//   // });

//   describe.each`
//     mutation                   | variables                                                                               | idName    | expected
//     ${createOrganisationMut}   | ${organisationVariablesData(`orgName${uniqueId}`, `orgNameId${uniqueId}`)}              | ${'test'} | ${notAuthorizedCode}
//     ${createEcoverseMut}       | ${ecoverseVariablesData(`ecoName${uniqueId}`, `ecoNameId${uniqueId}`, organisationId)}  | ${'test'} | ${notAuthorizedCode}
//     ${createChallengMut}       | ${challengeVariablesData('test', 'test', ecoverseNameId)}                               | ${'test'} | ${notAuthorizedCode}
//     ${createChildChallengeMut} | ${challengeVariablesData(`childChName${uniqueId}`, `chChName${uniqueId}`, challengeId)} | ${'test'} | ${notAuthorizedCode}
//   `('', ({ mutation, variables, idName, expected }) => {
//     let challengeId = '';
//     beforeAll(async done => {
//       const responseOrg = await createOrganisationMutation(
//         organisationName,
//         hostNameId + 'r'
//       );
//       console.log(responseOrg.body);
//       organisationId = responseOrg.body.data.createOrganisation.id;
//       let responseEco = await createEcoverseMutation(
//         ecoverseName,
//         ecoverseNameId,
//         organisationId
//       );
//       console.log(responseEco.body);
//       ecoverseId = responseEco.body.data.createEcoverse.id;
//       const res = await createChallangeMutation(
//         'testChallengeName',
//         challengeNameId,
//         ecoverseId
//       );
//       console.log(res.body);
//       challengeId = res.body.data.createChallenge.id;

//       done();
//     });
//     test(`returns ${expected}`, async () => {
//       const requestParamsCreateMutations = {
//         operationName: null,
//         query: mutation,
//         variables: await variables,
//       };
//       const response = await graphqlRequestAuth(
//         requestParamsCreateMutations,
//         TestUser.GLOBAL_ADMIN
//       );
//       console.log(response.body);
//       const responseData = JSON.stringify(response.body).replace('\\', '');
//       expect(response.status).toBe(200);
//       expect(responseData).not.toContain(expected);
//       expect(responseData).not.toContain(forbiddenCode);
//       expect(responseData).not.toContain(userNotRegistered);
//     });
//   });
// });
//let organisationId = '';
// describe('test', () => {
//   let organisationId = '';
//   beforeAll(async done => {
//     const responseOrg = await createOrganisationMutation(
//       organisationName,
//       hostNameId + 'r'
//     );
//     console.log(responseOrg.body);
//     organisationId = responseOrg.body.data.createOrganisation.id;
//     let responseEco = await createEcoverseMutation(
//       ecoverseName,
//       ecoverseNameId,
//       organisationId
//     );
//     console.log(responseEco.body);
//     ecoverseId = responseEco.body.data.createEcoverse.id;

//     done();
//   });

describe('test', () => {
  // arrange 
  let organisationId = '';
  beforeAll(async done => {
    const responseOrg = await createOrganisationMutation(
      organisationName,
      hostNameId + 'r'
    );
    console.log(responseOrg.body);
    organisationId = responseOrg.body.data.createOrganisation.id;
    let responseEco = await createEcoverseMutation(
      ecoverseName,
      ecoverseNameId,
      organisationId
    );
    console.log(responseEco.body);
    ecoverseId = responseEco.body.data.createEcoverse.id;

    done();
  });
  test.each`
    mutation                 | variables                                                                              | expected
    ${createOrganisationMut} | ${organisationVariablesData(`orgName${uniqueId}`, `orgNameId${uniqueId}`)}             | ${notAuthorizedCode}
    ${createEcoverseMut}     | ${ecoverseVariablesData(`ecoName${uniqueId}`, `ecoNameId${uniqueId}`, organisationId)} | ${notAuthorizedCode}
  `('', async ({ mutation, variables, expected }) => {
    // organisationId
    const requestParamsCreateMutations = {
      operationName: null,
      query: mutation,
      variables: await variables,
    };
    const response = await graphqlRequestAuth(
      requestParamsCreateMutations,
      TestUser.GLOBAL_ADMIN
    );
    console.log(response.body);
    const responseData = JSON.stringify(response.body).replace('\\', '');
    expect(response.status).toBe(200);
    expect(responseData).not.toContain(expected);
    expect(responseData).not.toContain(forbiddenCode);
    expect(responseData).not.toContain(userNotRegistered);
  });
});
//});
