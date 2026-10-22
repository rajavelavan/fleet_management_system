import { VehicleStatus, VehicleType } from "./fleet";
import { Alert } from "./geofence";

export interface LiveVehicleState {
  id: string;
  plate_number: string;
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  status: VehicleStatus;
  current_fuel?: number;
  fuel_capacity?: number;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  altitude?: number | null;
  accuracy?: number | null;
  last_seen_at: string;
  driver_name?: string | null;
  driver_phone?: string | null;
}

export interface LocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  altitude?: number | null;
  accuracy?: number | null;
  recorded_at: string;
}

export interface WsLocationUpdateMessage {
  type: "location_update";
  id?: string;
  vehicle_id: string;
  plate_number?: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  accuracy?: number | null;
  recorded_at: string;
  status?: VehicleStatus;
}

export interface WsAlertMessage {
  type: "alert";
  alert: Alert;
}

export interface WsSubscribedMessage {
  type: "subscribed";
  vehicle_id?: string;
  vehicle_ids?: string[];
}

export interface WsSubscribedAlertsMessage {
  type: "subscribed_alerts";
  channel?: string;
  user_id?: string;
}

export interface WsUnsubscribedMessage {
  type: "unsubscribed";
  vehicle_id?: string;
}

export interface WsErrorMessage {
  type: "error";
  message: string;
}

export interface WsPongMessage {
  type: "pong";
}

export type WsServerMessage =
  | WsLocationUpdateMessage
  | WsAlertMessage
  | WsSubscribedMessage
  | WsSubscribedAlertsMessage
  | WsUnsubscribedMessage
  | WsErrorMessage
  | WsPongMessage;
