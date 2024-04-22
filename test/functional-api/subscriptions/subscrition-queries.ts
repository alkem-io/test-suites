export const subscriptionChallengeCreated = `subscription SubspaceCreated($spaceID: UUID_NAMEID!) {  subspaceCreated(spaceID: $spaceID) {
		spaceID
    subspace{
      profile{
        displayName
      }
    }
  }
}`;

export const subscriptionOpportunityCreated = `subscription SubspaceCreated($challengeID: UUID!) {\n  subspaceCreated(challengeID: $challengeID) {
  subspace{
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
