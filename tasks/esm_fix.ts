import fs from 'fs/promises'
import path from 'path'

// Import subtask from hardhat using dynamic import to avoid ES module issues
import { subtask } from 'hardhat/config'

// Hook into the compile:solidity subtask
subtask('compile:solidity')
  .setAction(async (_, { config }, runSuper) => {
    const superRes = await runSuper()

    try {
      await fs.writeFile(
        path.join(config.paths.artifacts, 'package.json'),
        '{ "type": "commonjs" }',
      )
    } catch (error) {
      console.error('Error writing package.json: ', error)
    }

    return superRes
  })
