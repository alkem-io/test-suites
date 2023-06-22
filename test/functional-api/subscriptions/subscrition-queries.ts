export const subscriptionRoomMessageReceived = `subscription RoomMessageReceived($roomID: UUID!) {
  roomMessageReceived(roomID: $roomID) {
    message {
      id
      message
      sender {
        id
      }
    }
  }
}`;

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
