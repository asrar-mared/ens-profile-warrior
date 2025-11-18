import { NetworkHelpers } from "../network-helpers/network-helpers.js";
export default async () => {
    const handlers = {
        async newConnection(context, next) {
            const connection = await next(context);
            connection.networkHelpers = new NetworkHelpers(connection);
            return connection;
        },
    };
    return handlers;
};
//# sourceMappingURL=network.js.map