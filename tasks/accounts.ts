import { task } from 'hardhat/config'

task('accounts', 'Prints the list of accounts').setAction(async (_, hre) => {
  const { viem } = await hre.network.connect()
  const accounts = await viem.getWalletClients()

  for (const { account } of accounts) {
    console.log(account.address)
  }
})
