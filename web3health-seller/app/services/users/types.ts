/**
 * Defines the application model for a 'User'.
 * This is the shape the rest of the application will use.
 */
export type User = {
  userId: number;
  clerkId: string;
  email: string;
  name: string;
  birthYear?: number | null;
  raceId?: number | null;
  sexId?: number | null;
  heightNum?: number | null;
  weightNum?: number | null;
  roleId?: number | null;
  isActive?: boolean;
};

/**
 * Represents the raw data transfer object (DTO) for a user,
 * as it comes from the Supabase table `MST_User`.
 * Note the PascalCase convention from the database schema.
 */
export type UserDTO = {
  UserId: number;
  ClerkId: string;
  Email: string;
  Name: string;
  BirthYear: number | null;
  RaceId: number | null;
  SexId: number | null;
  HeightNum: number | null;
  WeightNum: number | null;
  RoleId: number | null;
  IsActive: boolean;
  CreatedOn: string;
  ModifiedOn: string;
};
