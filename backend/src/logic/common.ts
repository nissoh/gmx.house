import { ClientOptions, createClient, TypedDocumentNode } from "@urql/core"
import { DocumentNode } from "graphql"

export const prepareClient = (opts: ClientOptions) => {

  const client = createClient(opts)

  return async <Data = any, Variables extends object = {}>(
    document: DocumentNode | TypedDocumentNode<Data, Variables> | string,
    params: Variables
  ) => {

    const result = await client.query(document, params)
      .toPromise()
    
  
    if (result.error) {
      throw new Error(result.error.message)
    }
  
    return result.data!
  }
}



