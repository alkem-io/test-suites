import { getMails } from '@test/utils/mailslurper.rest.requests';

// To be used only in tests, when there is dependancy on thrid party service (i.e. mailslurper)
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns 2 values:
 ** 1st: emails array
 ** 2nd: emails count
 */
export const getMailsData = async () => {
  let response = await getMails();
  let emailsData = response.body.mailItems;
  let emailsCount = response.body.totalRecords;

  return [emailsData, emailsCount];
};

export let users = {
  globalAdminIdEmail: 'admin@alkem.io',
  globalAdminId: '',
  ecoverseMemberEmail: 'ecoverse.member@alkem.io',
  ecoverseMemberId: '',
  ecoverseAdminEmail: 'ecoverse.admin@alkem.io',
  ecoverseAdminId: '',
  nonEcoverseMemberEmail: 'non.ecoverse@alkem.io',
  nonEcoverseMemberId: '',
  qaUserEmail: 'qa.user@alkem.io',
  qaUserId: '',
};

export let entitiesId = {
  ecoverseId: '',
  organizationId: '',
  ecoverseCommunityId: '',
  ecoverseUpdatesId: '',
  ecoverseApplicationId: '',
  messageId: '',
  ecoverseCommunicationId: '',
  discussionId: '',
  challengeId: '',
  challengeCommunityId: '',
  challengeUpdatesId: '',
  challengeCommunicationId: '',
  opportunityId: '',
  opportunityCommunityId: '',
  opportunityUpdatesId: '',
};
