import { O, Op } from "@aelea/core"
import { filter, map } from "@most/core"


export interface ICommunicationMessage<TOPIC extends string, PAYLOAD> {
  topic: TOPIC
  body: PAYLOAD
}

export interface ICommunicationOp<TOPIC extends string, IN, OUT> {
  topic: TOPIC
  op: Op<IN, OUT>
}

export type ICommunication<TOPIC extends string, IN, OUT> = ICommunicationOp<TOPIC, IN, ICommunicationMessage<TOPIC, OUT>>


export type ICOMMZ<T, Server, Client> = {
  [P in keyof T]: {
    server: Server,
    client: Client
  }
}


// export type TournamentList = Op<string, ITournament>
// export type LeaderboardList = Op<LeaderboardApi, ITournament>


export const comLinkIn = <TOPIC extends string>(topic: TOPIC) => O(
  filter((data: ICommunicationMessage<TOPIC, any>) => {
    const isMessageValid = typeof data === 'object' && 'body' in data && 'topic' in data

    return isMessageValid && data.topic === topic
  }),
  map(x => x.body)
)



// export const comLink = {
//   tournamentList: ICommunication<'wakka', string, ITournament>
// }

// type StreamInputArray<T extends ICommunication<any, any, any>[]> = {
//   [P in keyof T]: T[P]
// }

// export type CommunicationInterface<ComList extends ICommunication<any, any, any>[]> = StreamInputArray<ComList>

