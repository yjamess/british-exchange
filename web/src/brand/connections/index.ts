/**
 * British Exchange connections — typed Explorer edges.
 * Contract: docs/connections-contract.md
 * Chrome: FollowStep + ArrivalFrom (design-lab/follow · options 1 + 4).
 */

export type {
  ArrivalContext,
  Connection,
  ConnectionDestination,
  ConnectionKind,
  ConnectionOrigin,
  ConnectionOriginQuery,
  ConnectionReadiness,
  ConnectionSelection,
} from "./types";

export {
  ARRIVAL_PARAMS,
  buildArrivalContext,
  connectionById,
  connectionsFor,
  primaryConnectionFor,
  readArrival,
  resolveConnectionHref,
  resolveFirstConnection,
} from "./resolve";

export {
  ENERGY_CONNECTIONS,
  energyConnectionById,
  energyConnectionsFor,
  firstEnergyConnection,
  followFuelConnection,
  primaryEnergyConnection,
  resolveEnergyConnectionHref,
  stationNationalGenerationHref,
} from "./energy";

export {
  HOUSING_CONNECTIONS,
  firstHousingConnection,
  housingConnectionById,
  housingConnectionsFor,
  primaryHousingConnection,
  resolveHousingConnectionHref,
} from "./housing";

export { ArrivalFrom, FollowLink, FollowList, FollowStep } from "./FollowLink";
export { EnergyStageFollow } from "./EnergyFollow";
