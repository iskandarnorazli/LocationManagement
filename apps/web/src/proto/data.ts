// Fixed data for the layout prototypes (#11). No API: every screenshot is the same each run.
export type ProtoLocation = { id: string; name: string; latitude: number; longitude: number };

export const SAVED: ProtoLocation[] = [
  { id: '1', name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 },
  { id: '2', name: 'Merdeka 118', latitude: 3.1415, longitude: 101.7003 },
  { id: '3', name: 'Batu Caves', latitude: 3.2379, longitude: 101.684 },
];

export const IMPORTED: ProtoLocation[] = [
  { id: '4', name: 'Petaling Street', latitude: 3.1435, longitude: 101.6976 },
  { id: '5', name: 'Thean Hou Temple', latitude: 3.1218, longitude: 101.6868 },
  { id: '6', name: 'KL Bird Park', latitude: 3.1427, longitude: 101.6884 },
];

export const USER_EMAIL = 'aisyah@example.com';

export type ProtoState =
  | 'markers'
  | 'popup'
  | 'invalid'
  | 'nav'
  | 'afterMap'
  | 'upload'
  | 'success'
  | 'error'
  | 'afterStay';

export const MAP_STATES: ProtoState[] = ['markers', 'popup', 'invalid', 'nav', 'afterMap'];
