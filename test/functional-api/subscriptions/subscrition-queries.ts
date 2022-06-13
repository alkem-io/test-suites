export const subscriptionCommentsMessageReceived = `subscription CommentsMessageReceived($commentsId: UUID!) {
  communicationCommentsMessageReceived(commentsID: $commentsId) {
    commentsID
    message {
      id
      message
      sender
    }
  }
}`;
