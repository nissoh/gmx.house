import { ClientOptions, createClient, OperationContext, TypedDocumentNode } from "@urql/core"

export const prepareClient = (opts: ClientOptions) => {

  const client = createClient(opts)

  return async <Data, Variables extends object = {}>(document: TypedDocumentNode<Data, Variables>, params: Variables, context?: Partial<OperationContext>): Promise<Data> => {
    const result = await client.query(document, params, context)
      .toPromise()
  
    if (result.error) {
      throw new Error(result.error.message)
    }
  
    return result.data!
  }
}



