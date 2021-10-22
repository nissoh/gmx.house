import { Contract } from '@ethersproject/contracts'
import { BaseProvider } from '@ethersproject/providers'
import { createClient, gql } from '@urql/core'
import fetch from 'isomorphic-fetch'


const erc721Abi = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 _tokenId) external view returns (string)',
]

const erc1155Abi = [
  'function balanceOf(address _owner, uint256 _id) view returns (uint256)',
  'function uri(uint256 _id) view returns (string)',
]

const baseUrl = 'https://arweave.net'

const queryNFT = gql`
query($id: String) {
  transactions(id: $id) {
    edges {
      node {
        id
        owner {
          address
        }
      }
    }
  }
}
`
const queryNFTAr = gql`
query($adress: String, $id: String) {
  transactions(where: { owners: $adress, tags: { name: "Origin", values: $id } }, sort: HEIGHT_DESC) {
    edges {
      node {
        id
      }
    }
  }
}
`

const arWeavce = createClient({
  fetch,
  url: `${baseUrl}/graphql`,
  requestPolicy: 'network-only'
})



export function getGatewayUrl (uri: string, tokenId?: string): string {
  const match = new RegExp(/([a-z]+)(?::\/\/|\/)(.*)/).exec(uri)

  if (!match || match.length < 3) {
    return uri
  }

  const id = match[2]
  let url = uri

  switch (match[1]) {
  case 'ar': {
    url = `https://arweave.net/${id}`
    break
  }
  case 'ipfs':
    if (id.includes('ipfs') || id.includes('ipns')) {
      url = `https://gateway.ipfs.io/${id}`
    } else {
      url = `https://gateway.ipfs.io/ipfs/${id}`
    }
    break
  case 'ipns':
    if (id.includes('ipfs') || id.includes('ipns')) {
      url = `https://gateway.ipfs.io/${id}`
    } else {
      url = `https://gateway.ipfs.io/ipns/${id}`
    }
    break
  case 'http':
  case 'https':
    break
  }

  return tokenId ? url.replaceAll('{id}', tokenId) : url
}

async function matchUrl(url: string, protocol: string, id: string) {
  if (protocol === 'ar') {
    const res = await arWeavce.query(queryNFT, { id }).toPromise()
    const tx = res.data.transactions.edges[0].node
    const nodeTx = await arWeavce.query(queryNFTAr, { address: tx.owner.address, id }).toPromise()
    if (nodeTx.data && nodeTx.data.transactions.edges.length > 0) {
      return `${baseUrl}/${res.data.transactions.edges[0].node.id}`
    }
    return `${baseUrl}/${id}`
  } else if (protocol === 'ipfs') {
    return `https://gateway.ipfs.io/ipfs/${id}`
  } else if (protocol === 'ipns') {
    return `https://gateway.ipfs.io/ipns/${id}`
  }
  
  return url
}

export interface IEnsClaim {
  twitterUrl?: string;
  imageUrl?: string;
  ensName: string;
}

export async function getIdentityFromENS(
  address: string,
  provider: BaseProvider
): Promise<IEnsClaim> {

  const ensName = await provider.lookupAddress(address)
  
  if (!ensName) {
    throw new Error(`could not resolve ENS for ${address}`)
  }

  const resolver = await provider.getResolver(ensName)

  if (!resolver) {
    throw new Error(`no resolver provided ${address}`)
  }

  const [avatarUrl, twitterUrl] = await Promise.all([resolver.getText('avatar'), resolver.getText('com.twitter')])

  if (!avatarUrl)  {
    return { ensName, twitterUrl }
  }


  const match = new RegExp(/([a-z]+):\/\/(.*)/).exec(avatarUrl)
  const match721 = new RegExp(/eip155:1\/erc721:(\w+)\/(\w+)/).exec(avatarUrl)
  const match1155 = new RegExp(/eip155:1\/erc1155:(\w+)\/(\w+)/).exec(avatarUrl)

  let imageUrl: string

  if (match && match.length === 3) {
    imageUrl = await matchUrl(avatarUrl, match[1], match[2])
  } else if (address && match721 && match721.length === 3) {
    const contractId = match721[1].toLowerCase()
    const tokenId = match721[2]
    const normalizedAddress = address.toLowerCase()
    const erc721Contract = new Contract(contractId, erc721Abi, provider)
    const ownerTokenId = await erc721Contract.ownerOf(tokenId)
      
    if (!ownerTokenId || ownerTokenId.toLowerCase() !== normalizedAddress) {
      throw new Error('ERC721 token not owned by address')
    }

    const tokenUri = await erc721Contract.tokenURI(tokenId)
    const gateway = getGatewayUrl(tokenUri, BigInt(tokenId).toString(16))
    const metadata = await (await fetch(gateway)).json()

    imageUrl = metadata.image

  } else if (address && match1155 && match1155.length === 3) {
    const contractId = match1155[1].toLowerCase()
    const tokenId = match1155[2]

    const erc1155Contract = new Contract(contractId, erc1155Abi, provider)
    const balance = await erc1155Contract.balanceOf(address, tokenId)

    if (BigInt(balance) === 0n) {
      throw new Error('ERC1155 token not owned by address')
    }

    const tokenURI = await erc1155Contract.uri(tokenId)
    const imageMetadata = await (await fetch(getGatewayUrl(tokenURI, BigInt(tokenId).toString(16)))).json()

    imageUrl = imageMetadata.image
  } else {
    imageUrl = getGatewayUrl(avatarUrl)
  }
  


  return { twitterUrl, imageUrl, ensName }
}





