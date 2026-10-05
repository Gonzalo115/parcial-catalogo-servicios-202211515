import { IsString, Length, MaxLength } from 'class-validator';
export class LoginDto {
  @IsString() @Length(1,254) identifier!:string;
  @IsString() @Length(1,72) @MaxLength(72) password!:string;
}
