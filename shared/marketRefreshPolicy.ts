export function shouldFetchMarketData(manualRequested: boolean) {
  return manualRequested;
}

export function shouldFetchBacktest(manualRequested: boolean, location: string) {
  return manualRequested && location === "/analysis";
}
