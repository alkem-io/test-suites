export const subscriptionCommentsMessageReceived = `subscription AspectCommentsMessageReceived($aspectID: UUID!) {
  aspectCommentsMessageReceived(aspectID: $aspectID) {
    message {
      id
      message
      sender
    }
  }
}`;
