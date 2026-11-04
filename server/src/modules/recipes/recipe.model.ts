import { HydratedDocument, model, Schema, Types } from 'mongoose';

export interface Recipe {
  owner: Types.ObjectId;
  title: string;
  description: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  tags: string[];
  ingredients: {
    quantity?: number;
    unit?: string;
    name: string;
  }[];
  steps: string[];
  sharedWith: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const recipeSchema = new Schema<Recipe>(
  {
    owner: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String },
    servings: { type: Number, required: true, min: 1 },
    prepMinutes: { type: Number, min: 0 },
    cookMinutes: { type: Number, min: 0 },
    tags: { type: [String] },
    ingredients: {
      type: [
        {
          quantity: { type: Number, min: 0 },
          unit: { type: String },
          name: { type: String, required: true },
        },
      ],
    },
    steps: { type: [String] },
    sharedWith: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], index: true },
  },
  { timestamps: true },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transform(_: any, ret: any): any {
  delete ret._id;
  delete ret.__v;
  return ret;
}

recipeSchema.set('toJSON', {
  virtuals: true,
  transform,
});

recipeSchema.set('toObject', {
  virtuals: true,
  transform,
});

export const RecipeModel = model<Recipe>('Recipe', recipeSchema);

export type RecipeDocument = HydratedDocument<Recipe>;

export interface OwnerRef {
  _id: Types.ObjectId;
  displayName: string;
}

export interface SharedUserRef {
  _id: Types.ObjectId;
  email: string;
  displayName: string;
}

export type PopulatedRecipeDocument = Omit<RecipeDocument, 'owner' | 'sharedWith'> & {
  owner: OwnerRef;
  sharedWith: SharedUserRef[];
};

export const RECIPE_POPULATE = [
  { path: 'owner', select: 'displayName' },
  { path: 'sharedWith', select: 'email displayName' },
];
