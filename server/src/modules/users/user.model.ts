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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transform(_: any, ret: any) {
  delete ret._id;
  delete ret.__v;
  delete ret.passwordHash;
  delete ret.createdAt;
  delete ret.updatedAt;
  return ret;
}

userSchema.set('toJSON', {
  virtuals: true,
  transform: transform,
});

userSchema.set('toObject', {
  virtuals: true,
  transform: transform,
});

export const UserModel = model<User>('User', userSchema);

export type UserDocument = HydratedDocument<User>;
