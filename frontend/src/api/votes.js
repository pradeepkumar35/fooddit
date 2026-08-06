import { client } from './client'

export const castVote = (votableType, votableId, voteValue) =>
  client.post('/votes', { votableType, votableId, voteValue }).then((res) => res.data)
