#!/usr/bin/env bun
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

// Create generated directory if it doesn't exist
mkdirSync('generated', { recursive: true })

// Find all artifact files
const artifactFiles = glob.sync('artifacts/contracts/**/*.sol/*.json', {
  ignore: ['**/*.dbg.json'],
})

const artifacts: Record<string, any> = {}

for (const file of artifactFiles) {
  const artifact = require(join(process.cwd(), file))
  const contractName = artifact.contractName

  if (contractName && artifact.abi && artifact.bytecode) {
    artifacts[contractName] = {
      ...artifact,
      metadata: artifact.metadata || '{}',
    }
  }
}

// Generate the artifacts export file
const artifactsContent = `// Auto-generated file - do not edit manually
export default ${JSON.stringify(artifacts, null, 2)};
`

writeFileSync('generated/artifacts.js', artifactsContent)
console.log(
  `Generated artifacts.js with ${Object.keys(artifacts).length} contracts`,
)
