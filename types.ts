
export enum AudioStyle {
  BOLERO = 'Bolero',
  KPOP = 'K-Pop',
  POP = 'Pop',
  POP_BALLAD = 'Pop Ballad',
  ROCK = 'Rock',
  ROCK_BALLAD = 'Rock Ballad',
  DISCO = 'Disco',
  MODERN = 'Hiện Đại',
  RUMBA = 'Rumba',
  EDM = 'EDM',
  ACOUSTIC = 'Acoustic'
}

export enum ScaleType {
  AUTO = 'Auto Detect',
  MAJOR = 'Major',
  MINOR = 'Minor',
  CHROMATIC = 'Chromatic'
}

export enum EffectMode {
  AUTO = 'Auto',
  MANUAL = 'Manual'
}

export enum HarmonyType {
  OFF = 'OFF',
  AUTO_3RD = 'Auto +3rd',
  AUTO_5TH = 'Auto +5th',
  DOUBLE = 'Double Voice',
  DOUBLE_H5 = 'Double + H5'
}

export interface ProcessingSettings {
  style: AudioStyle;
  autoTuneEnabled: boolean;
  scale: ScaleType;
  reverbEnabled: boolean;
  reverbMode: EffectMode;
  reverbLevel: number;
  delayEnabled: boolean;
  delayMode: EffectMode;
  delayLevel: number;
  harmony: HarmonyType;
  harmonyLevel: number;
}
