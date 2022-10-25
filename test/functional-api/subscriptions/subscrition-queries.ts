export const subscriptionCommentsMessageReceived = `subscription AspectCommentsMessageReceived($aspectID: UUID!) {
  aspectCommentsMessageReceived(aspectID: $aspectID) {
    message {
      id
      message
      sender
    }
  }
}`;

export const subscriptionChallengeCreated = `subscription ChallengeCreated($hubID: UUID_NAMEID!) {  challengeCreated(hubID: $hubID) {
		hubID
    challenge{
      displayName
    }
  }
}`;

export const subscriptionOpportunityCreated = `subscription OpportunityCreated($challengeID: UUID!) {\n  opportunityCreated(challengeID: $challengeID) {
  opportunity{
    displayName
  }
}
}`;
