import 'hardhat/types/config';
import { ArtifactGenerationConfig, ArtifactGenerationUserConfig } from './types.js';
declare module 'hardhat/types/config' {
    interface HardhatUserConfig {
        generateTypedArtifacts?: ArtifactGenerationUserConfig;
    }
    interface HardhatConfig {
        readonly generateTypedArtifacts: ArtifactGenerationConfig;
    }
}
//# sourceMappingURL=type-extensions.d.ts.map