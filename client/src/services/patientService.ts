
import { supabase, type Patient, type Consultation } from '../lib/supabase';

export const patientService = {
    async getPatients() {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Patient[];
    },

    async createPatient(name: string, birthDate?: string) {
        const { data, error } = await supabase
            .from('patients')
            .insert([{ name, birth_date: birthDate }])
            .select()
            .single();

        if (error) throw error;
        return data as Patient;
    },

    async searchPatients(query: string) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .ilike('name', `%${query}%`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Patient[];
    },

    async deletePatient(id: string) {
        const { error } = await supabase.from('patients').delete().eq('id', id);
        if (error) throw error;
    },
};

export const consultationService = {
    async createConsultation(patientId: string, notes?: string) {
        const { data, error } = await supabase
            .from('consultations')
            .insert([{ patient_id: patientId, notes }])
            .select()
            .single();

        if (error) throw error;
        return data as Consultation;
    },

    async uploadAnalysisImage(file: File, path: string) {
        const { data, error } = await supabase.storage
            .from('patient-photos')
            .upload(path, file);

        if (error) throw error;
        return data;
    },

    async getPublicUrl(path: string) {
        const { data } = supabase.storage.from('patient-photos').getPublicUrl(path);
        return data.publicUrl;
    },

    async createImageRecord(consultationId: string, url: string, type: 'dermoscopy' | 'clinical' | 'macro' = 'clinical') {
        const { data, error } = await supabase
            .from('images')
            .insert([{ consultation_id: consultationId, url, type }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async saveAnalysisResults(imageId: string, markers: any[], summary: any[]) {
        const { data, error } = await supabase
            .from('analysis_results')
            .insert([{ image_id: imageId, markers, summary_scores: summary }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
