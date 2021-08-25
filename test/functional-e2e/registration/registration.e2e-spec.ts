import puppeteer from 'puppeteer';
import RegistrationPage from './registration-page-object';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  getUser,
  removeUserMutation,
} from '@test/functional-api/user-management/user.request.params';

let userId;
const email = `mail-${uniqueId}@alkem.io`;
const password = 'test45612%%$';
const firstName = 'testFN';
const lastName = 'testLN';
const userFullName = firstName + ' ' + lastName;

describe('Registration smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({});
  });

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('add task to the list', () => {
    beforeEach(async () => {
      page = await browser.newPage();
      await page.goto(process.env.ALKEMIO_BASE_URL + '/identity/registration');
    });

    test.skip('User registers successfully', async () => {
      await RegistrationPage.register(
        page,
        email,
        password,
        firstName,
        lastName
      );
      expect(
        await RegistrationPage.verifyAuthenticatedUserAvatar(page)
      ).toContain(userFullName);

      const requestUserData = await getUser(email);
      userId = requestUserData.body.data.user.id;
      await removeUserMutation(userId);
    });

    test('User cannot register with invalid data successfully', async () => {
      await RegistrationPage.setUsername(page, email);
      expect(
        await RegistrationPage.verifyWarningRequiredSignInField(page)
      ).toEqual('Please fill required fields!');
    });
  });
});
