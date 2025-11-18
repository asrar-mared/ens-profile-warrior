import { generateTypes } from '../generate-types.js';
export default async () => {
    const handlers = {
        async onCleanUpArtifacts(context, artifactPaths, next) {
            let artifactPathsToProcess = [context.config.paths.artifacts];
            // if (context.config.generateTypedArtifacts.externalArtifacts) {
            // 	artifactPathsToProcess = artifactPathsToProcess.concat(
            // 		context.config.generateTypedArtifacts.externalArtifacts
            // 	);
            // }
            if (artifactPaths.length > 0) {
                await generateTypes({
                    artifacts: artifactPathsToProcess,
                }, context.config.generateTypedArtifacts);
            }
            return next(context, artifactPaths);
        },
    };
    return handlers;
};
//# sourceMappingURL=solidity.js.map