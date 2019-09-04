import * as mongoose from 'mongoose';

export interface IParties extends mongoose.Document {
    name: string;
    ceo: string;
    location: string;
    username: string;
    password: string;
    type: string;
    ndaKey: string;
    ndaSubmitted: boolean;
}

const PartiesSchema: mongoose.Schema = new mongoose.Schema({
    name: { type: String, required: true },
    ceo: { type: String, required: true },
    location: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    type: { type: String, required: true },
    ndaKey: { type: String },
    ndaSubmitted: { type: Boolean }
});

export default mongoose.model<IParties>('parties', PartiesSchema);