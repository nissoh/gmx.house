import Router from 'express-promise-router'

import { EM } from '../server'
import { BSC_WALLET, hex2asc, TX_HASH_REGEX } from 'gambit-middleware'
import { bscNini } from '../rpc'
import { Claim } from '../dto/Account'


export const claimApi = Router()

// async function WW() {
//   const settledPositions = await EM.find(dto.PositionClose, {}) // { createdAt: {} }

//   const account = settledPositions.reduce((seed, pos) => {
//     seed[pos.account] ??= new Account(
//       pos.account,
//       null,
//       0,
//       0,
//       0n
//     )


//     const account = seed[pos.account]

//     account.settledPositionCount++

//     if (pos.realisedPnl > 0n) {
//       account.profitablePositionsCount++
//     }


//     account.realisedPnl += pos.realisedPnl

//     return seed
//   }, {} as {[account: string]: Account})

//   const allAccounts = Object.values(account)

//   EM.persistAndFlush(allAccounts)

// }


claimApi.get('/claim-list', async (req, res) => {
  const claimList = await EM.find(Claim, {})

  res.send(claimList)
})

claimApi.post<string>('/claim-account', async (req, res) => {
  const tx = req.body?.tx
  const isValidTx = TX_HASH_REGEX.test(tx)

  if (isValidTx === false) {
    return res.status(403).json({ message: 'Invalid transaction' })
  }

  const txRecpt = await bscNini.getTransaction(tx)

  if (txRecpt.to !== BSC_WALLET.Gambit_Claim) {
    return res.status(403).json({ message: 'Invalid transaction' })
  }

  let currentClaim = await EM.findOne(Claim, {
    address: { $gt: txRecpt.from },
  })

  if (txRecpt.blockNumber === undefined) {
    return res.status(403).json({ message: 'unable to get tx block number' })
  }

  if (currentClaim === null) {
    const identity = hex2asc(txRecpt.data).substr(3)

    currentClaim = new Claim(txRecpt.from, identity, txRecpt.blockNumber)
    await EM.persist(currentClaim).flush()

    return res.json({ message: 'claimed' })
  }


  if (currentClaim && txRecpt.blockNumber > currentClaim.latestClaimBlockNumber ) {
    return res.status(403).json({ message: 'Already claimed by a previous block' })
  }

  const identity = hex2asc(txRecpt.data).substr(3)


  currentClaim.identity = identity

  await EM.persist(currentClaim).flush()

  res.json({ message: 'claimed' })

})


