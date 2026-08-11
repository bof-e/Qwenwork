import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsIn(['Enterprise', 'NGO', 'Consulting', 'Government'])
  industry!: string;
}

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsIn(['owner', 'executive', 'manager', 'analyst', 'viewer'])
  role!: string;
}
