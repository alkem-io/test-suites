export const subscriptionCommentsMessageReceived = `subscription AspectCommentsMessageReceived($aspectID: UUID!) {
  aspectCommentsMessageReceived(aspectID: $aspectID) {
    message {
      id
      message
      sender {
        id
      }
    }
  }
}`;

export const subscriptionChallengeCreated = `subscription ChallengeCreated($hubID: UUID_NAMEID!) {  challengeCreated(hubID: $hubID) {
		hubID
    challenge{
      profile{
        displayName
      }
    }
  }
}`;

export const subscriptionOpportunityCreated = `subscription OpportunityCreated($challengeID: UUID!) {\n  opportunityCreated(challengeID: $challengeID) {
  opportunity{
    profile {
      displayName
    }
  }
}
}`;
