import {
  createChallangeMutation,
  getChallengeData,
  getChallengesData,
  removeChallangeMutation,
} from './challenge.request.params';
import '../../../utils/array.matcher';


let challengeName = '';
let uniqueTextId = '';
let challengeId = '';
let challengeDataCreate = '';
let ecoverseId = '';

const challangeData = async (challengeId: string): Promise<string> => {
  const responseQuery = await getChallengeData(challengeId);
  console.log(responseQuery.body);
  const response = responseQuery.body.data.ecoverse.challenge;
  return response;
};

const challengesList = async (): Promise<string> => {
  const responseQuery = await getChallengesData();
  //console.log(responseQuery.body);
  const response = responseQuery.body.data.ecoverse.challenges;
  return response;
};
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  const response = await createChallangeMutation(challengeName, uniqueTextId);
  //console.log(response.body)
  challengeDataCreate = response.body.data.createChallenge;
  challengeId = response.body.data.createChallenge.id;
});




// afterEach(async () => {
//   await removeChallangeMutation(challengeId);
// });

describe('Create Challenge', () => {
  test('should create a successfull challenge', async () => {
    // Act
    const response = await createChallangeMutation(
      'challengeName',
      'chal-texti'
    );
    // console.log(response.body)
    const challengeDataCreate = response.body.data.createChallenge;
    const challengeIdTest = response.body.data.createChallenge.id;

    // Assert
    expect(response.status).toBe(200);
    expect(challengeDataCreate.displayName).toEqual('challengeName');
    expect(challengeDataCreate).toEqual(await challangeData(challengeIdTest));
  });

  test.skip('should remove a challenge', async () => {
    // Arrange
    const challangeDataBeforeRemove = await challangeData(challengeId);

    // Act
    const removeChallengeResponse = await removeChallangeMutation(challengeId);

    // Assert
    expect(removeChallengeResponse.status).toBe(200);
    expect(removeChallengeResponse.body.data.deleteChallenge.id).toEqual(
      challengeId
    );
    expect(await challengesList()).not.toContainObject(
      challangeDataBeforeRemove
    );
  });



});
