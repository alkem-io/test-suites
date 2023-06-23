export const subscriptionChallengeCreated = `subscription ChallengeCreated($spaceID: UUID_NAMEID!) {  challengeCreated(spaceID: $spaceID) {
		spaceID
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

export const subscriptionRooms = `subscription roomEvents($roomID: UUID!) {
  roomEvents(roomID: $roomID) {
    message {
      data {
        id
        message
        sender {
          id
        }
      }
    }
  }
}`;
