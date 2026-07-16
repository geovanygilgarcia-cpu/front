export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface PatientInformationDTO {
  fullName: string;
  phone: string;
  dateOfBirth: string; // yyyy-MM-dd
  email: string;
  gender: Gender;
  emergencyContact: string;
}

export interface ConditionDetailDTO {
  active: boolean;
  specific: string;
}

export interface MedicationDTO {
  active: boolean;
  medicationName: string;
}

export interface MedicalHistoryDTO {
  hasChronicDisease: ConditionDetailDTO;
  hasHadMajorSurgeries: ConditionDetailDTO;
  takesMedication: MedicationDTO;
  hasAllergies: ConditionDetailDTO;
}

export interface FamilyMedicalHistoryDTO {
  hasImmediateFamilyHistory: boolean;
  heartDisease: boolean;
  highBloodPressure: boolean;
  diabetes: boolean;
  cancer: ConditionDetailDTO;
  other: ConditionDetailDTO;
}

export interface ReasonForVisitDTO {
  symptoms: string;
  symptomDuration: string;
  previousTreatment: string;
}

export interface FollowUpAppointmentDTO {
  active: boolean;
  date: string; // yyyy-MM-dd
}

export interface DoctorNotesDTO {
  initialEvaluation: string;
  recommendedTestsOrTreatments: string;
  followUpAppointment: FollowUpAppointmentDTO;
}

export interface PatientIntakeFormDTO {
  pacienteId: number;
  patientInformation: PatientInformationDTO;
  medicalHistory: MedicalHistoryDTO;
  familyMedicalHistory: FamilyMedicalHistoryDTO;
  reasonForVisit: ReasonForVisitDTO;
  doctorNotes: DoctorNotesDTO;
}

export interface HistoriaClinicaResponseDTO extends PatientIntakeFormDTO {
  id: number;
  createdAt: string;
}
