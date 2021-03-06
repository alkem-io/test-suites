import {
  createUser,
  getUsersProfile,
  removeUser,
  updateProfile,
} from './user.request.params';
import '@test/utils/array.matcher';

let userFirstName = '';
let userLastName = '';
let userName = '';
let userId = '';
let profileId = '';
let userPhone = '';
let userEmail = '';
let uniqueId = '';
const profileDescritpion = 'y';

beforeEach(() => {
  uniqueId = Math.random()
    .toString(36)
    .slice(-6);
  userName = `test-user${uniqueId}`;
  userFirstName = `FirstName ${uniqueId}`;
  userLastName = `LastName ${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

describe('Create User', () => {
  afterEach(async () => {
    await removeUser(userId);
  });

  test('should update profile and query the updated data', async () => {
    // Arrange
    const response = await createUser(userName);
    profileId = response.body.data.createUser.profile.id;
    userId = response.body.data.createUser.id;

    // Act
    const updateProfileResponse = await updateProfile(
      profileId,
      profileDescritpion
    );

    const getProfileDataResponse = await getUsersProfile(userId);
    const profileData = getProfileDataResponse.body.data.user.profile;

    // Assert
    expect(response.status).toBe(200);
    expect(updateProfileResponse.body.data.updateProfile.id).toEqual(profileId);
    expect(profileData.description).toEqual(profileDescritpion);
  });
});
