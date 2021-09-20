
# Marionette - Mirror Trading https://www.gambit.page/

Introduction to a new social financial instrument powered by Gambit DAO

Mirror trading have two types of participants, a trader and an investor

Trader uses Marionette have control(trade only) over a trading pool of liquidity provided by investors, the more success he has through trading, the higher likelihood he will have control over a bigger liquidity pool, other factors includes characteristics of their investing style and the amount of capital they stakes(staking is required in order to trade)

Investor uses Marionette platform to have visibility of traders track record, they can choose to provide liquidity to a trader based on his performance, investment risk style and "skin in the game"(based on metrics the platform provides)

By skinned, i refer to a Phrase coined by Nicolas Nassim Taleb "Skin in the game". by context, if you have been given control of investors liquidity and reap the benefits of a successful trade, you should also share the harm and pay penalty from unsuccessful ones, this is important as it provides a symmetry for risk, this trait is a natural feedback for self improvement for both participant types

## Trader

Rules

- Has to come up with his own capital and stake it into a trading pool to effectively trade
- Capital allows to get liquidity from each investor with a maximum of trader own capital 1-to-1
- actions. all actions are initiated through trander's own GLP pool and adhere to GMX trading fees <https://gambit.gitbook.io/gambit/fees>
  - increase: new/existing a position
  - decrease: remove liquidity and change leverage to existing position
  - close: remove all liquidity from an existing position

Incentives

- Higher returns as Successful trade yields additional 0.9% of total realized profit
- successful track record increases capital, raises limit for bigger pool

## Investor

Rules

- provide liquidity to any trader(limited by his skin(stake))(Responsibly), by providing liquidity you own % in trader pool(similar to staking)
- withdraw liquidity from trader pool in effect to take profit, return remaining liquidity after a loss or rebalance other better trader

Incentives

- transfer responsibility to a trader that is more likely to be successful in generating revenue
- choosing to provide liquidity to multiple trader with different style may form kind of hedging to mitigate risk

## Shared

Rules

- Actions. effectively owning % of trading pool by adding or removing liquidity
  - add: provide or increase liquidity to a pool in form of USDG(converts internally swappable token into USDG)
  - remove: removing some or all existing liquidity from pool

Incentives

- (maybe(optional)) during idle periods, liquidity could be put to work in order to generate APY?
- achieve clout by having an identity, pseudo or real one(reference to a supported social media platforms)

## Gambit DAO Incentive to implement this

Implementing this feature could also be used internally(by composing internal mirror functionality) to take positions algorithimacally, i think this will help to increase over collaterlization

The social part and mirroring feature incentivices traders to get more users join and use gambit. Spending funds for PR would also be easier as we could provide incentives funds to start using the mirror platform to get an initial kickstart and form userbase

### notes

Some aspects of Mirror trading is illegal in some countries due to the illicit use of it
<https://www.investopedia.com/terms/m/mirror-trading.asp>

Popular Platform eToro does Mirror trading they have some restriction on mirroring traders from other countries
