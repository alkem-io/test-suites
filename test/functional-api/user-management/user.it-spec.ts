import { getUserMemberships, getUsers } from './user.request.params';
import '@test/utils/array.matcher';

describe('Query all users', () => {
  it('should get users', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
    expect(response.body.data.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'admin@alkem.io',
        }),
      ])
    );
  });

  test('should get memberships', async () => {
    const response = await getUserMemberships();

    expect(response.status).toBe(200);
  });
});
