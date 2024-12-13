import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AuthService } from '../../auth/auth.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateSettingsDto } from '../dto/update-settings.dto';

describe('Users Profile Integration Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    await app.init();

    // Create test user and get auth token
    const testUser = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };
    const auth = await authService.register(testUser);
    authToken = auth.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/profile', () => {
    it('should get user profile successfully', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', 'test@example.com');
          expect(res.body).toHaveProperty('settings');
          expect(res.body.settings).toHaveProperty('theme');
          expect(res.body.settings).toHaveProperty('language');
        });
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });
  });

  describe('PATCH /users/profile', () => {
    it('should update profile successfully', () => {
      const updateData: UpdateProfileDto = {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Test bio'
      };

      return request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('firstName', 'John');
          expect(res.body).toHaveProperty('lastName', 'Doe');
          expect(res.body).toHaveProperty('bio', 'Test bio');
        });
    });

    it('should fail with invalid data', () => {
      const invalidData = {
        firstName: 123, // Should be string
        lastName: 'D', // Too short
      };

      return request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('PATCH /users/settings', () => {
    it('should update settings successfully', () => {
      const updateData: UpdateSettingsDto = {
        theme: 'dark',
        language: 'en',
        emailNotifications: true
      };

      return request(app.getHttpServer())
        .patch('/users/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.settings).toHaveProperty('theme', 'dark');
          expect(res.body.settings).toHaveProperty('language', 'en');
          expect(res.body.settings).toHaveProperty('emailNotifications', true);
        });
    });

    it('should fail with invalid theme', () => {
      const invalidData = {
        theme: 'invalid-theme'
      };

      return request(app.getHttpServer())
        .patch('/users/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });
});
