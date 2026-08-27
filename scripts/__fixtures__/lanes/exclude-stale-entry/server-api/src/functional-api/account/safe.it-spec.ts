import { TestUser } from '@alkemio/tests-lib';

test('does nothing hazardous', () => {
  expect(TestUser).toBeUndefined();
  expect(1).toBe(1);
});
