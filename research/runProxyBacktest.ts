import { getProxyBacktest } from "../server/marketData";

const result = await getProxyBacktest();
console.log(JSON.stringify(result, null, 2));
