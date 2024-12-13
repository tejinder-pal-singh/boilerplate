import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '../../users/entities/user.entity';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get('auth.github.clientId'),
      clientSecret: configService.get('auth.github.clientSecret'),
      callbackURL: configService.get('auth.github.callbackUrl'),
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, username, emails, displayName } = profile;
    const [firstName, lastName] = (displayName || username || '').split(' ');
    
    const user = {
      id,
      email: emails[0].value,
      firstName,
      lastName: lastName || '',
    };

    const tokens = await this.authService.validateOAuthLogin(
      user,
      AuthProvider.GITHUB,
    );
    return tokens;
  }
}
