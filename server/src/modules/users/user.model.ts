import { HydratedDocument, model, Schema } from 'mongoose';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
}

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_, ret: any) => {
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

userSchema.set('toObject', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_, ret: any) => {
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

export const UserModel = model<User>('User', userSchema);

export type UserDocument = HydratedDocument<User>;
