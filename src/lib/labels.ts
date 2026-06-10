import type {
  ProjectType,
  Entreprenadform,
  ProjectStatus,
  MilestoneStatus,
  MeetingType,
  ActionStatus,
  InvoiceStatus,
  AtaStatus,
  DocumentCategory,
  RiskLevel,
  RiskStatus,
} from "@prisma/client";

// Svenska etiketter för alla enum-värden i datamodellen.

export const projectTypeLabels: Record<ProjectType, string> = {
  NYBYGGNAD: "Nybyggnad",
  OMBYGGNAD: "Ombyggnad",
  ROT: "ROT",
  ANLAGGNING: "Anläggning",
  FORVALTNING: "Förvaltning",
};

export const entreprenadformLabels: Record<Entreprenadform, string> = {
  TOTALENTREPRENAD: "Totalentreprenad",
  UTFORANDEENTREPRENAD: "Utförandeentreprenad",
  DELAD: "Delad entreprenad",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  PLANERING: "Planering",
  UPPHANDLING: "Upphandling",
  PRODUKTION: "Produktion",
  BESIKTNING: "Besiktning",
  GARANTITID: "Garantitid",
  AVSLUTAT: "Avslutat",
};

export const milestoneStatusLabels: Record<MilestoneStatus, string> = {
  EJ_PABORJAD: "Ej påbörjad",
  PAGAENDE: "Pågående",
  KLAR: "Klar",
};

export const meetingTypeLabels: Record<MeetingType, string> = {
  BYGGMOTE: "Byggmöte",
  PROJEKTERINGSMOTE: "Projekteringsmöte",
  EKONOMIMOTE: "Ekonomimöte",
  STARTMOTE: "Startmöte",
};

export const actionStatusLabels: Record<ActionStatus, string> = {
  OPPEN: "Öppen",
  PAGAENDE: "Pågående",
  KLAR: "Klar",
  FORSENAD: "Försenad",
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  ATT_GRANSKA: "Att granska",
  ATTESTERAD: "Attesterad",
  BESTRIDEN: "Bestriden",
  BETALD: "Betald",
};

export const ataStatusLabels: Record<AtaStatus, string> = {
  ANMALD: "Anmäld",
  PRISSATT: "Prissatt",
  GODKAND: "Godkänd",
  AVSLAGEN: "Avslagen",
  FAKTURERAD: "Fakturerad",
};

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  RITNINGAR: "Ritningar",
  AVTAL: "Avtal",
  PROTOKOLL: "Protokoll",
  BESIKTNING: "Besiktning",
  EKONOMI: "Ekonomi",
  ATA: "ÄTA",
  MYNDIGHET: "Myndighet",
  OVRIGT: "Övrigt",
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  LAG: "Låg",
  MEDEL: "Medel",
  HOG: "Hög",
};

export const riskStatusLabels: Record<RiskStatus, string> = {
  OPPEN: "Öppen",
  HANTERAD: "Hanterad",
  STANGD: "Stängd",
};
