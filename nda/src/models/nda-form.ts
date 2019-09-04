import * as mongoose from 'mongoose';

export interface INdaForm extends mongoose.Document {
    disclosingparty: string;
    disclosingpartylocation: string;
    receivingparty: string;
    receivingpartylocation: string;
    date: string;
    regarding: string;
    partyusername: string;
}

const INdaForm: mongoose.Schema = new mongoose.Schema({
    disclosingparty: { type: String, required: true },
    disclosingpartylocation: { type: String, required: true },
    receivingparty: { type: String, required: true },
    receivingpartylocation: { type: String, required: true },
    date: { type: String, required: true },
    regarding: { type: String, required: true },
    partyusername: { type: String, required: true }
});

export default mongoose.model<INdaForm>('ndaforms', INdaForm);