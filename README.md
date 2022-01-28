# PayTweet

An Twitter Oracle on Solana based on the Demox Protocol. 

This program implements an escrow pay for tweet. If a tweet 2 conditions:
1. Author must match intended author
2. Text must match: this can be hashtags or account mentions.

The bounty creator, makes and funds the escrow account, specifying a default recipient.
If the tweet contains a Solana address after meeting the conditions, that address will override the default recipient.

This repository implements the Solana program and provides some utilities to make interacting with it easier.

# Installation

1. Ensure that Anchor and all of its dependencies are installed: https://project-serum.github.io/anchor/getting-started/introduction.html
1. `yarn install`
1. Rename the `Anchor.example.toml` to `Anchor.toml` and update the `wallet =` to your solana key.
1. Start the `solana-test-validator`
1. Run `anchor build && anchor deploy`
1. Use the Program Id found from the deploy. Replace `GxJJd3q28eUd7kpPCbNXGeixqHmBYJ2owqUYqse3ZrGS` with your new Program Id.
1. Run the tests: `anchor test`


# Security Considerations

1. This code has not been audited by a third party. If you find issues please submit them. We plan get an audit as soon as we can.
2. The twitter data for the Oracle are provided by Twitter.com. Outages are certainly possible because Twitter can go down. Please make sure to build in error handling for delays or outages. Usually execution takes about 30 second though from tweet to payment.
3. The Demox Protocol is in its beginning stages and at this point, still requires trust in Demox Labs as a third party. With the launch of our dVPN, no third party need be trusted but for this, it requires trusting that we're not fabricating packet captures and tls sessions. We will publish logs of data uploaded through our system as to show usage consistent with that publicly available onchain.

# Troubleshooting

## Problems with Anchor
* The most common problem with anchor is using the right version of node. I recommend install Node through NVM and using `Node v16.11.1`. 

# Potential Modifications
* Tweet races, enable multiple twitter accounts to raise to claim the prize

# License

We use the `GNU Affero General Public License v3.0 or later` license to ensure the community will always have access to all original and derivations of this program.
Full text here: https://spdx.org/licenses/AGPL-3.0-or-later.html
